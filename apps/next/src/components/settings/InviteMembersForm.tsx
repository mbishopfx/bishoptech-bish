'use client';

import React, { useState } from 'react';
import { Button } from '@rift/ui/button';
import { Input } from '@rift/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rift/ui/select';

interface InviteMembersFormProps {
  onInvite: (email: string, role: string) => void;
  isLoading?: boolean;
}

export function InviteMembersForm({ onInvite, isLoading = false }: InviteMembersFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onInvite(email.trim(), role);
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <Input
        type="email"
        placeholder="Ingresa direcciones de correo..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Select value={role} onValueChange={(v) => setRole(v ?? 'member')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Selecciona un rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Miembro</SelectItem>
          <SelectItem value="admin">Administrador</SelectItem>
          <SelectItem value="owner">Propietario</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="submit"
        disabled={isLoading || !email.trim()}
      >
        {isLoading ? 'Enviando...' : 'Enviar invitación'}
      </Button>
    </form>
  );
}
