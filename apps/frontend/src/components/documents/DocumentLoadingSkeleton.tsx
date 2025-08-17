import React from 'react';

interface DocumentLoadingSkeletonProps {
  count?: number;
  viewMode?: 'grid' | 'list';
}

export default function DocumentLoadingSkeleton({ 
  count = 6, 
  viewMode = 'grid' 
}: DocumentLoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {skeletons.map((index) => (
          <div
            key={index}
            className="card-dark rounded-lg p-4 shadow-dark-lg animate-pulse"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-16 bg-gray-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-1/3"></div>
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skeletons.map((index) => (
        <div
          key={index}
          className="card-dark rounded-xl p-6 shadow-dark-lg animate-pulse"
        >
          {/* Document Preview */}
          <div className="aspect-[8.5/11] bg-gray-700 rounded-lg mb-4"></div>
          
          {/* Document Info */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
          
          {/* Actions */}
          <div className="pt-4 border-t border-dark-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
            </div>
            <div className="w-4 h-4 bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}