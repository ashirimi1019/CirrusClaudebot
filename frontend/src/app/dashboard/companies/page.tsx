"use client";
import React, { useEffect, useState } from "react";
import {
  Building2, Search, Globe, Users, Briefcase, Calendar, Loader2,
  ExternalLink, Download, FileSpreadsheet,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { exportToXlsx } from "@/lib/export-xlsx";

type Company = {
  id: string;
  domain: string;
  name: string;
  employee_count: number | null;
  company_size: string | null;
  funding_stage: string | null;
  industry: string | null;
  country: string;
  fit_score: number;
  created_at: string;
  evidence: { title: string; type: string; source: string }[];
};

function SignalBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    job_post: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    funding: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    tech_signal: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    news: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border",
        styles[type] ?? "bg-neutral-800 text-neutral-400 border-neutral-700",
      )}
    >
      {type.replace("_", " ")}
    </span>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("companies")
      .select("id, domain, name, employee_count, company_size, funding_stage, industry, country, fit_score, created_at, evidence(title, type, source)")
      .order("fit_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }: { data: Company[] | null }) => {
        if (data) setCompanies(data);
        setLoading(false);
      });
  }, []);

  const filtered = companies.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.domain?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCsvExport = () => {
    const csvEscape = (val: string | number | null | undefined): string => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csv = [
      "Company,Domain,Industry,Employees,Funding Stage,Country,ICP Score,Signals",
      ...filtered.map((c) =>
        [
          csvEscape(c.name),
          csvEscape(c.domain),
          csvEscape(c.industry),
          csvEscape(c.employee_count ?? c.company_size),
          csvEscape(c.funding_stage),
          csvEscape(c.country ?? "US"),
          csvEscape(c.fit_score),
          csvEscape(c.evidence?.map((e) => e.type).join("; ")),
        ].join(","),
      ),
    ].join("\n");
    const bom = "\uFEFF";
    const url = URL.createObjectURL(new Blob([bom + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "companies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleXlsxExport = () => {
    exportToXlsx(
      filtered.map((c) => ({
        Company: c.name ?? "",
        Domain: c.domain,
        Industry: c.industry ?? "",
        Employees: c.employee_count ?? c.company_size ?? "",
        "Funding Stage": c.funding_stage ?? "",
        Country: c.country ?? "US",
        "ICP Score": c.fit_score,
        Signals: c.evidence?.map((e) => e.type).join("; ") ?? "",
        Added: new Date(c.created_at).toLocaleDateString(),
      })),
      "companies",
      "Companies",
    );
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Companies</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {loading ? "Loading…" : `${companies.length.toLocaleString()} discovered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            {filtered.length > 0 ? `Export ${filtered.length.toLocaleString()} (CSV)` : "Export CSV"}
          </button>
          <button
            onClick={handleXlsxExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-700/50 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {filtered.length > 0 ? `Export ${filtered.length.toLocaleString()} (XLSX)` : "Export XLSX"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Companies",
            value: loading ? "—" : companies.length.toLocaleString(),
            icon: Building2,
            color: "bg-indigo-500/20",
          },
          {
            label: "With Hiring Signal",
            value: loading ? "—" : companies
              .filter((c) => c.evidence?.some((e) => e.type === "job_post"))
              .length.toLocaleString(),
            icon: Briefcase,
            color: "bg-violet-500/20",
          },
          {
            label: "ICP Qualified (170+)",
            value: loading ? "—" : companies.filter((c) => c.fit_score >= 170).length.toLocaleString(),
            icon: Globe,
            color: "bg-emerald-500/20",
          },
          {
            label: "US Companies",
            value: loading ? "—" : companies
              .filter((c) => c.country === "US" || !c.country)
              .length.toLocaleString(),
            icon: Users,
            color: "bg-rose-500/20",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
              <div className={cn("p-1.5 rounded-lg", color)}>
                <Icon className="h-3.5 w-3.5 text-white/80" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search by name, domain, or industry…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading companies…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm font-medium">
              {search ? "No companies match your search" : "No companies discovered yet"}
            </p>
            <p className="text-neutral-600 text-xs mt-1">
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="text-indigo-400 hover:underline"
                >
                  Clear search
                </button>
              ) : (
                "Open a campaign and run Skill 4 to discover ICP-matched companies."
              )}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                {["Company", "Domain", "Industry", "ICP Score", "Country", "Signals", "Added"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs text-neutral-500 font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-white text-sm">{c.name || "—"}</div>
                    {c.funding_stage && (
                      <div className="text-xs text-neutral-500 mt-0.5">{c.funding_stage}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={`https://${c.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs font-mono"
                    >
                      {c.domain}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </td>
                  <td className="px-5 py-4 text-neutral-400 text-xs max-w-[140px] truncate">
                    {c.industry || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold ${
                        c.fit_score >= 170
                          ? "text-emerald-400"
                          : c.fit_score >= 120
                          ? "text-yellow-400"
                          : c.fit_score > 0
                          ? "text-neutral-400"
                          : "text-neutral-600"
                      }`}
                    >
                      {c.fit_score > 0 ? c.fit_score : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-neutral-400 text-xs">{c.country || "US"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.evidence?.slice(0, 2).map((e, i) => (
                        <SignalBadge key={i} type={e.type} />
                      ))}
                      {(c.evidence?.length ?? 0) > 2 && (
                        <span className="text-xs text-neutral-600">
                          +{c.evidence.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-neutral-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
