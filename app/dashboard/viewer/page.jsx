'use client';

import { Card } from '@/components/ui/Card';
import { Eye, Newspaper, BookOpen, TrendingUp, Bell, Star } from 'lucide-react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

export default function ViewerDashboard() {
    useInactivityTimer(1); // 1 minute timeout for inactivity
  const recentContent = [
    { title: 'Annual Security Report 2024', date: '2 days ago', views: 156 },
    { title: 'New Feature Release: RBAC System', date: '5 days ago', views: 89 },
    { title: 'Security Best Practices Guide', date: '1 week ago', views: 234 },
    { title: 'Q1 Performance Review', date: '2 weeks ago', views: 67 },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Viewer Dashboard</h1>
        <p className="text-muted mt-2">Content & Information Hub</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">New Content</p>
              <p className="text-2xl font-bold text-foreground">24</p>
            </div>
            <Newspaper className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Read Later</p>
              <p className="text-2xl font-bold text-foreground">8</p>
            </div>
            <BookOpen className="h-8 w-8 text-success" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Trending</p>
              <p className="text-2xl font-bold text-foreground">12</p>
            </div>
            <TrendingUp className="h-8 w-8 text-warning" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Notifications</p>
              <p className="text-2xl font-bold text-foreground">3</p>
            </div>
            <Bell className="h-8 w-8 text-error" />
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Content</h2>
          <div className="space-y-3">
            {recentContent.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-primary/5 transition cursor-pointer">
                <Eye className="h-5 w-5 text-muted" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <div className="flex gap-3 mt-1">
                    <p className="text-xs text-muted">{item.date}</p>
                    <p className="text-xs text-muted">{item.views} views</p>
                  </div>
                </div>
                <Star className="h-4 w-4 text-muted hover:text-warning cursor-pointer" />
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recommended for You</h2>
          <div className="space-y-3">
            {['Understanding RBAC', 'Security Best Practices', 'Content Guidelines'].map((item, i) => (
              <div key={i} className="p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border-l-4 border-primary">
                <p className="text-sm text-foreground">{item}</p>
                <p className="text-xs text-muted mt-1">Recommended based on your interests</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}