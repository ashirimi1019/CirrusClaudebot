'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Briefcase, ChevronRight, Target, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Offer {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  campaigns?: { id: string }[];
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('offers')
          .select('id, name, slug, created_at, campaigns(id)')
          .order('created_at', { ascending: false });
        setOffers((data as Offer[]) ?? []);
      } catch {
        // Supabase may not be configured — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Offers</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {loading
              ? 'Loading…'
              : offers.length > 0
              ? `${offers.length} offer${offers.length !== 1 ? 's' : ''} · Each defines a positioning canvas`
              : 'Each offer defines your positioning. Campaigns live inside offers.'}
          </p>
        </div>
        <Link
          href="/dashboard/offers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Offer
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading offers…</span>
        </div>
      ) : offers.length === 0 ? (
        <div className="border border-dashed border-neutral-700 rounded-xl p-14 text-center">
          <Briefcase className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-300 font-medium mb-1">No offers yet</p>
          <p className="text-neutral-500 text-sm mb-6">
            Create your first offer to define the positioning canvas and start campaigns.
          </p>
          <Link
            href="/dashboard/offers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Create First Offer
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((offer) => {
            const campaignCount = offer.campaigns?.length ?? 0;
            return (
              <Link
                key={offer.id}
                href={`/dashboard/offers/${offer.slug}`}
                className="group flex items-center justify-between p-5 bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-indigo-500/15 border border-indigo-500/25 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-sm">
                      {offer.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-neutral-500 font-mono">{offer.slug}</p>
                      {campaignCount > 0 && (
                        <>
                          <span className="text-neutral-700">·</span>
                          <span className="text-xs text-neutral-500">
                            {campaignCount} campaign{campaignCount !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/offers/${offer.slug}/campaigns/new`}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden group-hover:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-all"
                  >
                    <Target className="h-3 w-3" /> New Campaign
                  </Link>
                  <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
