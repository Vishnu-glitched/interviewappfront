import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center">
      <div className="glass-card p-8 flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-gray-300 text-sm">Loading your dashboard...</p>
        <div className="text-xs text-gray-500 text-center">
          <p>If this takes too long, please check:</p>
          <p>• Your internet connection</p>
          <p>• Supabase configuration</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;