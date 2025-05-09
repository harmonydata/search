"use client";

import React, { useEffect, useState } from 'react';
import { User, ExternalLink } from 'lucide-react';
import OrganizationCard from './OrganizationCard';
import { findOrganizationLogo } from '@/lib/utils/shared';

interface FundersSectionProps {
  funders?: Array<{ name: string; url?: string; logo?: string }>;
}

const FundersSection: React.FC<FundersSectionProps> = ({ funders }) => {
  const [processedFunders, setProcessedFunders] = useState<Array<{ name: string; url?: string; logo?: string }>>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (!funders || funders.length === 0) return;

    console.log('Processing funders in FundersSection:', funders);
    
    try {
      // Process funders to resolve logos
      const enhanced = funders.map(funder => {
        // Skip processing if we don't have a name
        if (!funder.name) return funder;
        
        // Check if the name appears to be an abbreviation
        const isAbbreviation = funder.name.length <= 10 && funder.name === funder.name.toUpperCase();
        
        // Find a logo if one isn't already provided
        const resolvedLogo = funder.logo || findOrganizationLogo(funder.name);
        console.log(`Resolved logo for "${funder.name}" (abbreviation: ${isAbbreviation}):`, resolvedLogo);
        
        return {
          ...funder,
          logo: resolvedLogo
        };
      });
      
      setProcessedFunders(enhanced);
      
      // Set debug info
      setDebugInfo(`Processed ${enhanced.length} funders. ` + 
                  `${enhanced.filter(f => f.logo).length} with logos.`);
    } catch (error) {
      console.error('Error processing funders:', error);
      setDebugInfo(`Error processing funders: ${error instanceof Error ? error.message : String(error)}`);
      // In case of error, still try to show the original funders
      setProcessedFunders(funders);
    }
  }, [funders]);

  if (!funders || funders.length === 0) {
    return null;
  }

  // Helper function to truncate long funder names
  const truncateName = (name: string, maxLength = 30) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 mb-4 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <User className="h-5 w-5 mr-2 text-primary" />
        <h2 className="text-lg font-semibold">Funders</h2>
        
        {process.env.NODE_ENV !== 'production' && debugInfo && (
          <span className="ml-2 text-xs text-gray-500 italic">{debugInfo}</span>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-2">
          {processedFunders.map((funder, index) => (
            <div key={`${funder.name}-${index}`} className="min-w-[180px] max-w-[250px]">
              <OrganizationCard 
                name={truncateName(funder.name)}
                url={funder.url} 
                logo={funder.logo}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FundersSection; 