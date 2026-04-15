'use client';

import { Card } from '@/components/ui/Card';
import { FileText, Edit, CheckCircle, Clock, PlusCircle, FolderOpen } from 'lucide-react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

export default function EditorDashboard() {
    useInactivityTimer(1); // 1 minute timeout for inactivity
  const stats = {
    totalContent: 156,
    publishedContent: 89,
    draftContent: 45,
    pendingReview: 22
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Editor Dashboard</h1>
        <p className="text-muted mt-2">Content Management & Publishing</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Content</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalContent}</p>
            </div>
            <FileText className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Published</p>
              <p className="text-2xl font-bold text-foreground">{stats.publishedContent}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Drafts</p>
              <p className="text-2xl font-bold text-foreground">{stats.draftContent}</p>
            </div>
            <Edit className="h-8 w-8 text-warning" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Pending Review</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingReview}</p>
            </div>
            <Clock className="h-8 w-8 text-error" />
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Content</h2>
            <button className="text-primary hover:text-primary-hover text-sm flex items-center gap-1">
              <PlusCircle className="h-4 w-4" /> Create New
            </button>
          </div>
          <div className="space-y-3">
            {['Blog Post Draft', 'Product Update', 'Newsletter', 'Announcement'].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <FolderOpen className="h-5 w-5 text-muted" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item}</p>
                  <p className="text-xs text-muted">Last edited {i + 1} hour{i !== 0 ? 's' : ''} ago</p>
                </div>
                <Edit className="h-4 w-4 text-primary cursor-pointer" />
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Content Calendar</h2>
          <div className="space-y-3">
            {['Monday: Blog Post', 'Wednesday: Product Update', 'Friday: Newsletter'].map((item, i) => (
              <div key={i} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-foreground">{item}</p>
                <p className="text-xs text-muted">Due this week</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}