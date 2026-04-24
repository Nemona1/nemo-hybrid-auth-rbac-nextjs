'use client';

import { Card } from '@/components/ui/Card';
import { Users, CheckSquare, Clock, TrendingUp, UserCheck, FileText } from 'lucide-react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
export default function ManagerDashboard() {
    useInactivityTimer(1); // 1 minute timeout for inactivity
  const stats = {
    teamMembers: 8,
    pendingApprovals: 5,
    completedTasks: 42,
    activeProjects: 3
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Manager Dashboard</h1>
        <p className="text-muted mt-2">Team Management & Overview</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Team Members</p>
              <p className="text-2xl font-bold text-foreground">{stats.teamMembers}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingApprovals}</p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Completed Tasks</p>
              <p className="text-2xl font-bold text-foreground">{stats.completedTasks}</p>
            </div>
            <CheckSquare className="h-8 w-8 text-success" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Active Projects</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeProjects}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <UserCheck className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">Team member completed a task</p>
                  <p className="text-xs text-muted">{i} hour{i !== 1 ? 's' : ''} ago</p>
                </div>
                <FileText className="h-4 w-4 text-muted" />
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Team Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Productivity</span>
                <span>85%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Task Completion</span>
                <span>92%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}