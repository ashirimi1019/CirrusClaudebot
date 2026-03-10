/** API client types and tool usage */

export interface ToolUsageInput {
  campaign_id?: string | null;
  tool_name: string;
  action_name?: string | null;
  units_used?: number;
  estimated_cost?: number | null;
  request_payload?: Record<string, unknown> | null;
  response_summary?: string | null;
}

export interface ApiError {
  tool: string;
  message: string;
  status_code?: number;
  raw?: unknown;
}

export interface ApolloSearchParams {
  roles: string[];
  locations: string[];
  employee_ranges: string[];
  per_page?: number;
}

export interface ApolloPersonSearchParams {
  organization_ids: string[];
  titles: string[];
  per_page?: number;
}

export type KnownTool =
  | 'apollo_company_search'
  | 'apollo_people_search'
  | 'apollo_contact_create'
  | 'apollo_sequence_enroll'
  | 'apollo_sequence_metrics'
  | 'openai_copy_generation';
