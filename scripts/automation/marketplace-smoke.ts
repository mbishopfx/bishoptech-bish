#!/usr/bin/env bun

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

type SmokeAdapter = {
  readonly routeHref: string
  readonly sql: (input: {
    organizationId: string
    userId: string
    now: number
  }) => string
}

const BUILT_IN_ADAPTERS: Record<string, SmokeAdapter> = {
  projects: {
    routeHref: '/projects',
    sql: ({ organizationId, userId, now }) => `
      begin;
      insert into project (id, organization_id, title, description, status, created_by_user_id, created_at, updated_at)
      values ('smoke_project_${now}', '${organizationId}', 'Smoke Project ${now}', 'Automation smoke run', 'active', '${userId}', ${now}, ${now});
      insert into project_member (id, project_id, organization_id, user_id, access_role, added_by_user_id, created_at, updated_at)
      values ('smoke_project_member_${now}', 'smoke_project_${now}', '${organizationId}', '${userId}', 'owner', '${userId}', ${now}, ${now});
      insert into project_note (id, project_id, organization_id, created_by_user_id, title, content, created_at, updated_at)
      values ('smoke_project_note_${now}', 'smoke_project_${now}', '${organizationId}', '${userId}', 'Smoke Note', 'Created by marketplace smoke harness', ${now}, ${now});
      update project set title = 'Smoke Project ${now} Updated', updated_at = ${now + 1} where id = 'smoke_project_${now}';
      select count(*)::int from project where id = 'smoke_project_${now}';
      delete from project where id = 'smoke_project_${now}';
      commit;
    `,
  },
  ticket_triage: {
    routeHref: '/tickets',
    sql: ({ organizationId, userId, now }) => `
      begin;
      insert into ticket (id, organization_id, title, description, severity, status, created_by_user_id, created_at, updated_at)
      values ('smoke_ticket_${now}', '${organizationId}', 'Smoke Ticket ${now}', 'Automation smoke run', 'medium', 'submitted', '${userId}', ${now}, ${now});
      insert into ticket_member (id, ticket_id, organization_id, user_id, access_role, added_by_user_id, created_at, updated_at)
      values ('smoke_ticket_member_${now}', 'smoke_ticket_${now}', '${organizationId}', '${userId}', 'owner', '${userId}', ${now}, ${now});
      update ticket set status = 'approved', updated_at = ${now + 1} where id = 'smoke_ticket_${now}';
      select count(*)::int from ticket where id = 'smoke_ticket_${now}';
      delete from ticket where id = 'smoke_ticket_${now}';
      commit;
    `,
  },
  playbooks: {
    routeHref: '/playbooks',
    sql: ({ organizationId, userId, now }) => `
      begin;
      insert into playbook (id, organization_id, title, summary, status, created_by_user_id, created_at, updated_at)
      values ('smoke_playbook_${now}', '${organizationId}', 'Smoke Playbook ${now}', 'Automation smoke run', 'draft', '${userId}', ${now}, ${now});
      insert into playbook_step (id, playbook_id, organization_id, title, content, position, created_at, updated_at)
      values
        ('smoke_playbook_step_1_${now}', 'smoke_playbook_${now}', '${organizationId}', 'Kickoff', 'Confirm scope and owner.', 0, ${now}, ${now}),
        ('smoke_playbook_step_2_${now}', 'smoke_playbook_${now}', '${organizationId}', 'QA', 'Run the validation pass.', 1, ${now}, ${now});
      update playbook
         set title = 'Smoke Playbook ${now} Updated',
             summary = 'Automation smoke run updated',
             status = 'active',
             updated_at = ${now + 1}
       where id = 'smoke_playbook_${now}';
      select count(*)::int from playbook where id = 'smoke_playbook_${now}';
      delete from playbook where id = 'smoke_playbook_${now}';
      commit;
    `,
  },
  social_publishing: {
    routeHref: '/social',
    sql: ({ organizationId, userId, now }) => `
      begin;
      insert into social_post (id, organization_id, title, content, channels, status, created_by_user_id, created_at, updated_at)
      values ('smoke_social_${now}', '${organizationId}', 'Smoke Social ${now}', 'Automation smoke post', '["social_x"]'::jsonb, 'draft', '${userId}', ${now}, ${now});
      update social_post set status = 'scheduled', scheduled_for = ${now + 60000}, updated_at = ${now + 1} where id = 'smoke_social_${now}';
      select count(*)::int from social_post where id = 'smoke_social_${now}';
      delete from social_post where id = 'smoke_social_${now}';
      commit;
    `,
  },
  voice_campaigns: {
    routeHref: '/voice',
    sql: ({ organizationId, userId, now }) => `
      begin;
      insert into voice_campaign (id, organization_id, title, status, assistant_template_key, provider_mode, provisioning_status, created_by_user_id, csv_file_name, created_at, updated_at)
      values ('smoke_voice_${now}', '${organizationId}', 'Smoke Voice ${now}', 'draft', 'arch3r-outbound-default', 'managed', 'awaiting_provisioning', '${userId}', 'smoke.csv', ${now}, ${now});
      update voice_campaign set status = 'queued', updated_at = ${now + 1} where id = 'smoke_voice_${now}';
      select count(*)::int from voice_campaign where id = 'smoke_voice_${now}';
      delete from voice_campaign where id = 'smoke_voice_${now}';
      commit;
    `,
  },
  sms_campaigns: {
    routeHref: '/sms',
    sql: ({ organizationId, userId, now }) => `
      begin;
      insert into sms_campaign (id, organization_id, title, status, message_template, created_by_user_id, csv_file_name, created_at, updated_at)
      values ('smoke_sms_${now}', '${organizationId}', 'Smoke SMS ${now}', 'draft', 'Hello from smoke test', '${userId}', 'smoke.csv', ${now}, ${now});
      update sms_campaign set status = 'queued', updated_at = ${now + 1} where id = 'smoke_sms_${now}';
      select count(*)::int from sms_campaign where id = 'smoke_sms_${now}';
      delete from sms_campaign where id = 'smoke_sms_${now}';
      commit;
    `,
  },
}

function parseArgs(argv: string[]) {
  const flags: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (!current?.startsWith('--')) continue
    const key = current.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    flags[key] = value
    index += 1
  }
  if (!flags['plugin-key']) {
    throw new Error('Missing required --plugin-key')
  }
  return flags
}

function run(command: string, args: string[]) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim()
}

function readRailwayDatabaseUrl() {
  if (process.env.ARCH3R_POSTGRES_DATABASE_URL?.trim()) {
    return process.env.ARCH3R_POSTGRES_DATABASE_URL.trim()
  }
  const raw = run('railway', ['variables', '--service', 'Postgres', '--json'])
  const vars = JSON.parse(raw) as Record<string, string>
  const databaseUrl =
    vars.DATABASE_PUBLIC_URL?.trim() || vars.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('Missing Railway Postgres database URL.')
  }
  return databaseUrl
}

function runSql(databaseUrl: string, sql: string) {
  return run('psql', [databaseUrl, '-AtX', '-v', 'ON_ERROR_STOP=1', '-c', sql])
}

/**
 * Better Auth requires an Origin header for the email sign-in endpoint, so the
 * smoke harness uses curl with a cookie jar to mimic the browser login flow
 * that the daily automation will rely on for Matt-org verification.
 */
function signInAndCaptureSession(input: {
  baseUrl: string
  email: string
  password: string
}) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'arch3r-smoke-'))
  const cookieJarPath = path.join(tempDir, 'cookies.txt')
  const bodyPath = path.join(tempDir, 'body.json')

  const statusCode = run('curl', [
    '-sS',
    '-o',
    bodyPath,
    '-c',
    cookieJarPath,
    '-w',
    '%{http_code}',
    `${input.baseUrl}/api/auth/sign-in/email`,
    '-H',
    'content-type: application/json',
    '-H',
    `origin: ${input.baseUrl}`,
    '--data',
    JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  ])

  if (statusCode !== '200') {
    const responseText = readFileSync(bodyPath, 'utf8')
    rmSync(tempDir, { recursive: true, force: true })
    throw new Error(`Sign-in failed (${statusCode}): ${responseText}`)
  }

  const sessionText = run('curl', [
    '-sS',
    '-b',
    cookieJarPath,
    `${input.baseUrl}/api/auth/get-session`,
  ])
  const sessionPayload = JSON.parse(sessionText) as {
    session?: {
      activeOrganizationId?: string
    }
    user?: {
      id?: string
    }
  }

  const organizationId = sessionPayload.session?.activeOrganizationId?.trim()
  const userId = sessionPayload.user?.id?.trim()
  if (!organizationId || !userId) {
    rmSync(tempDir, { recursive: true, force: true })
    throw new Error('Sign-in succeeded but no active organization was resolved.')
  }

  return {
    tempDir,
    cookieJarPath,
    organizationId,
    userId,
  }
}

function resolveAdapter(flags: Record<string, string>) {
  const pluginKey = flags['plugin-key']
  const builtIn = BUILT_IN_ADAPTERS[pluginKey]
  if (builtIn) return builtIn

  const routeHref = flags.route?.trim()
  const sqlFile = flags['sql-file']?.trim()
  if (!routeHref || !sqlFile) {
    throw new Error(
      `Plugin ${pluginKey} needs either a built-in adapter or both --route and --sql-file.`,
    )
  }

  return {
    routeHref,
    sql: ({ organizationId, userId, now }: { organizationId: string; userId: string; now: number }) =>
      readFileSync(path.resolve(sqlFile), 'utf8')
        .replaceAll('{{organizationId}}', organizationId)
        .replaceAll('{{userId}}', userId)
        .replaceAll('{{now}}', String(now)),
  } satisfies SmokeAdapter
}

function checkRouteLoads(baseUrl: string, cookieJarPath: string, routeHref: string) {
  const statusCode = run('curl', [
    '-sS',
    '-o',
    '/dev/null',
    '-b',
    cookieJarPath,
    '-w',
    '%{http_code}',
    `${baseUrl}${routeHref}`,
  ])
  if (statusCode !== '200') {
    throw new Error(`Route ${routeHref} returned ${statusCode}.`)
  }
}

function readPluginGateSummary(input: {
  databaseUrl: string
  mattOrganizationId: string
  pluginKey: string
}) {
  const mattQuery = `
    select coalesce(
      (
        select activation_status || '|' || nav_visible::text
        from org_plugin_installations
        where organization_id = '${input.mattOrganizationId}'
          and plugin_key = '${input.pluginKey}'
        limit 1
      ),
      'missing'
    );
  `
  const nonEntitledQuery = `
    select count(*)::int
      from org_subscription s
      left join org_plugin_installations i
        on i.organization_id = s.organization_id
       and i.plugin_key = '${input.pluginKey}'
     where s.plan_id = 'free'
       and coalesce(i.nav_visible, false) = true;
  `

  return {
    mattState: runSql(input.databaseUrl, mattQuery),
    nonEntitledVisibleCount: Number(runSql(input.databaseUrl, nonEntitledQuery)),
  }
}

const flags = parseArgs(process.argv.slice(2))
const baseUrl =
  flags['base-url']?.trim() ||
  process.env.ARCH3R_BASE_URL?.trim() ||
  'https://web-production-070f1.up.railway.app'
const mattEmail = process.env.ARCH3R_QA_MATT_EMAIL?.trim()
const mattPassword = process.env.ARCH3R_QA_MATT_PASSWORD?.trim()
if (!mattEmail || !mattPassword) {
  throw new Error('Missing ARCH3R_QA_MATT_EMAIL or ARCH3R_QA_MATT_PASSWORD.')
}

const adapter = resolveAdapter(flags)
const databaseUrl = readRailwayDatabaseUrl()
const session = signInAndCaptureSession({
  baseUrl,
  email: mattEmail,
  password: mattPassword,
})

try {
  checkRouteLoads(baseUrl, session.cookieJarPath, adapter.routeHref)
  const now = Date.now()
  const sqlResult = runSql(
    databaseUrl,
    adapter.sql({
      organizationId: session.organizationId,
      userId: session.userId,
      now,
    }),
  )
  const gateSummary = readPluginGateSummary({
    databaseUrl,
    mattOrganizationId: session.organizationId,
    pluginKey: flags['plugin-key'],
  })

  /**
   * Matt-org smoke should only pass when the target plugin is actually active
   * for the enterprise org and visible in the toolbar. This catches the common
   * failure mode where the route exists but the marketplace gating contract is
   * still broken.
   */
  if (gateSummary.mattState !== 'active|true') {
    throw new Error(
      `Matt enterprise org is not fully activated for ${flags['plugin-key']} (state: ${gateSummary.mattState}).`,
    )
  }

  if (gateSummary.nonEntitledVisibleCount > 0) {
    throw new Error(
      `Found ${gateSummary.nonEntitledVisibleCount} free orgs with visible toolbar access for ${flags['plugin-key']}.`,
    )
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        pluginKey: flags['plugin-key'],
        routeHref: adapter.routeHref,
        mattOrganizationId: session.organizationId,
        mattState: gateSummary.mattState,
        nonEntitledVisibleCount: gateSummary.nonEntitledVisibleCount,
        sqlResult,
      },
      null,
      2,
    ),
  )
} finally {
  rmSync(session.tempDir, { recursive: true, force: true })
}
