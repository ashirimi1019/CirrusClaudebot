/** Offer-related types */

export interface OfferInput {
  name: string;
  description?: string;
  category?: string;
  target_market?: string;
  positioning_summary?: string;
  icp_summary?: string;
  buyer_summary?: string;
  positioning: Record<string, unknown>;
}

export interface PositioningCanvas {
  category: string;
  target: string;
  problem: string;
  why_now: string;
  alternative: string;
  success_signal: string;
  value_prop: string;
  differentiators: string[];
  sales_model: string;
  objections: string[];
  gtm: string;
  pricing: string;
  proof: string;
}
