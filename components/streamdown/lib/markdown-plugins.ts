import type { Pluggable, PluggableList } from 'unified';

type MarkdownPluginSet = {
  remark: PluggableList;
  rehype: PluggableList;
};

type MarkdownPluginOptions = {
  gfm?: boolean;
  math?: boolean;
  raw?: boolean;
};

let gfmPromise: Promise<unknown> | null = null;
let mathPromise: Promise<unknown> | null = null;
let katexPromise: Promise<unknown> | null = null;
let rawPromise: Promise<unknown> | null = null;
let katexCssLoaded = false;

const loadGfm = async (): Promise<Pluggable> => {
  if (!gfmPromise) {
    gfmPromise = import('remark-gfm').then((mod) => mod.default ?? mod);
  }
  return gfmPromise as Promise<Pluggable>;
};

const loadMath = async (): Promise<Pluggable> => {
  if (!mathPromise) {
    mathPromise = import('remark-math').then((mod) => mod.default ?? mod);
  }
  return mathPromise as Promise<Pluggable>;
};

const loadKatex = async (): Promise<Pluggable> => {
  if (!katexPromise) {
    katexPromise = import('rehype-katex').then((mod) => mod.default ?? mod);
  }
  return katexPromise as Promise<Pluggable>;
};

const loadRaw = async (): Promise<Pluggable> => {
  if (!rawPromise) {
    rawPromise = import('rehype-raw').then((mod) => mod.default ?? mod);
  }
  return rawPromise as Promise<Pluggable>;
};

export const detectMath = (text: string) =>
  /\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\(|\\\[/.test(text);

export const detectRawHtml = (text: string) =>
  /<\/?[a-z][\s\S]*?>/i.test(text);

export const loadMarkdownPlugins = async ({
  gfm = true,
  math = false,
  raw = false,
}: MarkdownPluginOptions): Promise<MarkdownPluginSet> => {
  const remark: PluggableList = [];
  const rehype: PluggableList = [];

  if (gfm) {
    remark.push(await loadGfm());
  }

  if (math) {
    const [remarkMath, rehypeKatex] = await Promise.all([loadMath(), loadKatex()]);
    remark.push(remarkMath);
    rehype.push(rehypeKatex);
    if (!katexCssLoaded) {
      await import('katex/dist/katex.min.css');
      katexCssLoaded = true;
    }
  }

  if (raw) {
    rehype.push(await loadRaw());
  }

  return { remark, rehype };
};

