import React from 'react';
import { ShieldCheck, AlertTriangle, MessageSquare, UserCheck, Ghost } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TrustScoreProps {
  score: number;
  badges: string[];
  reviewCount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-brand-success bg-brand-success/10 border-brand-success/20';
  if (score >= 50) return 'text-brand-blue bg-brand-blue/10 border-brand-blue/20';
  if (score >= 30) return 'text-brand-warning bg-brand-warning/10 border-brand-warning/20';
  return 'text-red-500 bg-red-500/10 border-red-500/20';
};

const badgeConfig: Record<string, { icon: any, label: string, color: string }> = {
  verified: { icon: UserCheck, label: 'Verified', color: 'text-brand-success bg-brand-success/10' },
  responsive: { icon: MessageSquare, label: 'Responsive', color: 'text-brand-blue bg-brand-blue/10' },
  scam_warning: { icon: AlertTriangle, label: 'Scam Risk', color: 'text-red-500 bg-red-500/10' },
  unresponsive: { icon: Ghost, label: 'Ghost Town', color: 'text-gray-500 bg-gray-500/10' },
};

export const TrustScore: React.FC<TrustScoreProps> = ({ score, badges = [], reviewCount, size = 'md', showLabel = true, onClick }) => {
  const scoreColor = getScoreColor(score);
  
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <div className={`flex flex-col gap-2 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={onClick}>
      <div className="flex items-center gap-2">
        <div className={cn(
          "font-black rounded-full border flex items-center gap-1.5", 
          scoreColor,
          sizeClasses[size]
        )}>
          <ShieldCheck size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
          <span>{score}</span>
        </div>
        
        {reviewCount > 0 && (
          <span className="text-[10px] text-text-tertiary font-medium">
            ({reviewCount} reviews)
          </span>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map(badge => {
            const config = badgeConfig[badge];
            if (!config) return null;
            const Icon = config.icon;
            
            return (
              <div key={badge} className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-transparent",
                config.color,
                size === 'sm' ? 'text-[9px]' : 'text-[10px]'
              )}>
                <Icon size={10} />
                <span className="font-bold uppercase tracking-wider">{config.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
