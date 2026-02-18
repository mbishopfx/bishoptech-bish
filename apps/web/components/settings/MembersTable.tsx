import React from 'react';
import Image from "next/image";
import { StatusBadge } from './StatusBadge';
import { MoreVerticalIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rift/ui/dropdown-menu';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  avatar?: string;
}

interface MembersTableProps {
  members: Member[];
  onEditMember?: (member: Member) => void;
  onRemoveMember?: (member: Member) => void;
}

export function MembersTable({ members, onEditMember, onRemoveMember }: MembersTableProps) {
  const getRoleBadgeStatus = (role: string) => {
    switch (role) {
      case 'owner':
        return 'enabled';
      case 'admin':
        return 'enabled';
      case 'member':
        return 'not-required';
      default:
        return 'not-required';
    }
  };

  const getStatusBadgeStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'enabled';
      case 'pending':
        return 'not-required';
      case 'suspended':
        return 'disabled';
      default:
        return 'not-required';
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="overflow-hidden border border-white/50 rounded-lg">
      <table className="min-w-full divide-y divide-black/5">
        <thead className="bg-background-settings">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Member
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-background-settings divide-y divide-black/5">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-hover">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {member.avatar ? (
                      <Image
                        className="h-10 w-10 rounded-full object-cover"
                        src={member.avatar}
                        alt={member.name}
                        width={40}
                        height={40}
                        unoptimized
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-t from-blue-500 to-blue-400 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {getInitial(member.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={getRoleBadgeStatus(member.role)}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </StatusBadge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={getStatusBadgeStatus(member.status)}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </StatusBadge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                      <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEditMember && (
                      <DropdownMenuItem onClick={() => onEditMember(member)}>
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onRemoveMember && member.role !== 'owner' && (
                      <DropdownMenuItem 
                        onClick={() => onRemoveMember(member)}
                        variant="destructive"
                      >
                        Remove
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
