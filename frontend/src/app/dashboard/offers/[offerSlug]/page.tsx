'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Target, ChevronRight, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Campaign {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface Offer {
  id: string;
  name: string;
  slug: string;
}

export default function OfferDetailPage() {
  const { offerSlug } = useParams<{ offerSlug: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: rawOfferData } = await supabase
          .from('offers')
          .select('id, name, slug')
          .eq('slug', offerSlug)
          .single();
        const offerData = rawOfferData as Offer | null;

        if (offerData) {
          setOffer(offerData);
          const { data: campaignData } = await supabase
            .from('campaigns')
            .select('id, name, slug, created_at')
            .eq('offer_id', offerData.id)
            .order('created_at', { ascending: false });
          setCampaigns(campaignData ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [offerSlug]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/offers" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">
            {offer?.name ?? offerSlug}
          </h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">{offerSlug}</p>
        </div>
        <Link
          href={`/dashboard/offers/${offerSlug}/campaigns/new`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href={`/dashboard/offers/${offerSlug}/campaigns/new`}
          className="flex items-center gap-3 p-4 bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 rounded-xl transition-all group"
        >
          <div className="h-9 w-9 bg-indigo-500/15 border border-indigo-500/25 rounded-lg flex items-center justify-center">
            <Target className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
              New Campaign
            </p>
            <p className="text-xs text-gray-500">Run Skill 2</p>
          </div>
        </Link>
        <a
          href={`/api/skills/status?offer=${offerSlug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-4 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-xl transition-all group"
        >
          <div className="h-9 w-9 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Positioning File</p>
            <p className="text-xs text-gray-500">View positioning.md</p>
          </div>
        </a>
      </div>

      {/* Campaigns list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Campaigns
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            Loading…
          </div>
        ) : campaigns.length === 0 ? (
          <div className="border border-dashed border-neutral-700 rounded-xl p-10 text-center">
            <Target className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium mb-1 text-sm">No campaigns yet</p>
            <p className="text-gray-500 text-xs mb-4">
              Create a campaign to start the 6-skill pipeline.
            </p>
            <Link
              href={`/dashboard/offers/${offerSlug}/campaigns/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/dashboard/offers/${offerSlug}/campaigns/${campaign.slug}`}
                className="group flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="h-4 w-4 text-indigo-400/70" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{campaign.slug}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
