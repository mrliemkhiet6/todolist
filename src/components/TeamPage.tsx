import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Calendar,
  CheckCircle,
  Clock,
  UserPlus,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { supabase } from '../lib/supabase';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
  last_active?: string;
}

const TeamPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, profile } = useAuthStore();
  const { tasks, projects } = useTaskStore();

  useEffect(() => {
    fetchTeamMembers();
  }, [user]);

  const fetchTeamMembers = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get all project members from user's projects
      const { data: projectMembers, error } = await supabase
        .from('project_members')
        .select(`
          role,
          created_at,
          user:profiles (
            id,
            name,
            email,
            avatar_url
          ),
          project:projects (
            id,
            title,
            owner_id
          )
        `)
        .in('project_id', projects.map(p => p.id));

      if (error) throw error;

      // Process and deduplicate team members
      const membersMap = new Map<string, TeamMember>();
      
      // Add current user first
      if (profile) {
        membersMap.set(user.id, {
          id: user.id,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          role: 'owner',
          joined_at: profile.created_at,
          last_active: 'now'
        });
      }

      // Add other team members
      projectMembers?.forEach((pm: any) => {
        if (pm.user && pm.user.id !== user.id) {
          const existingMember = membersMap.get(pm.user.id);
          if (!existingMember || pm.role === 'owner' || pm.role === 'admin') {
            membersMap.set(pm.user.id, {
              id: pm.user.id,
              name: pm.user.name,
              email: pm.user.email,
              avatar_url: pm.user.avatar_url,
              role: pm.role,
              joined_at: pm.created_at,
              last_active: Math.random() > 0.5 ? 'online' : '2 hours ago' // Mock data
            });
          }
        }
      });

      setTeamMembers(Array.from(membersMap.values()));
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setIsLoading(true);
      
      // In a real app, you would send an invitation email
      // For now, we'll just show a success message
      alert(`Invitation sent to ${inviteEmail}`);
      
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const getTasksForMember = (memberId: string) => {
    return tasks.filter(task => task.assignee_id === memberId);
  };

  const getCompletedTasksForMember = (memberId: string) => {
    return tasks.filter(task => task.assignee_id === memberId && task.status === 'done');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'member':
        return 'bg-green-100 text-green-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">
            Manage your team members and their roles across projects.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">{teamMembers.length}</div>
          <div className="text-gray-600 text-sm">Team Members</div>
        </div>
      </div>

      {/* Team Members List */}
      {isLoading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team members...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No members found' : 'No team members yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms.'
              : 'Invite team members to start collaborating on projects.'
            }
          </p>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => {
            const memberTasks = getTasksForMember(member.id);
            const completedTasks = getCompletedTasksForMember(member.id);
            
            return (
              <motion.div
                key={member.id}
                className="card p-6 hover-lift"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Member Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                      alt={member.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Role and Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                    {member.role}
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${
                      member.last_active === 'online' || member.last_active === 'now' 
                        ? 'bg-green-500' 
                        : 'bg-gray-400'
                    }`} />
                    <span>
                      {member.last_active === 'now' ? 'Online' : member.last_active}
                    </span>
                  </div>
                </div>

                {/* Task Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{memberTasks.length}</div>
                    <div className="text-xs text-gray-500">Assigned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{completedTasks.length}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                </div>

                {/* Member Actions */}
                <div className="flex space-x-2">
                  <button className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center space-x-1">
                    <Mail className="w-3 h-3" />
                    <span>Message</span>
                  </button>
                  <button className="btn-secondary text-sm py-2 px-3">
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input focus-ring"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input focus-ring"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim() || isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;