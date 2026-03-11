"use client";
import React, { useEffect, useState } from "react";
import {
  Users, Search, Mail, Linkedin, Calendar, Loader2,
  ExternalLink, Building2, Copy, Check, FileSpreadsheet, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { exportToXlsx } from "@/lib/export-xlsx";

type Buyer = {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string | null;
  enriched_at: string;
  created_at: string;
  companies: { name: string; domain: string } | null;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-neutral-600 hover:text-neutral-300"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function ContactsPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("contacts")
      .select("*, companies(name, domain)")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }: { data: Buyer[] | null }) => {
        if (data) setBuyers(data);
        setLoading(false);
      });
  }, []);

  const filtered = buyers.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.first_name?.toLowerCase().includes(q) ||
      b.last_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.title?.toLowerCase().includes(q) ||
      b.companies?.name?.toLowerCase().includes(q)
    );
  });

  const handleCsvExport = () => {
    const csv = ["First Name,Last Name,Title,Company,Domain,Email,LinkedIn"]
      .concat(
        filtered.map(
          (b) =>
            `${b.first_name},${b.last_name},${b.title},${b.companies?.name ?? ""},${b.companies?.domain ?? ""},${b.email},${b.linkedin_url ?? ""}`,
        ),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
  };

  const handleXlsxExport = () => {
    exportToXlsx(
      filtered.map((b) => ({
        "First Name": b.first_name,
        "Last Name": b.last_name,
        Title: b.title,
        Company: b.companies?.name ?? "",
        Domain: b.companies?.domain ?? "",
        Email: b.email,
        LinkedIn: b.linkedin_url ?? "",
        Added: new Date(b.created_at).toLocaleDateString(),
      })),
      "contacts",
      "Contacts",
    );
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {loading ? "Loading…" : `${buyers.length.toLocaleString()} decision-makers`}
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
          { label: "Total Contacts", value: loading ? "—" : buyers.length.toLocaleString(), icon: Users, color: "bg-indigo-500/20" },
          { label: "With Email", value: loading ? "—" : buyers.filter((b) => b.email).length.toLocaleString(), icon: Mail, color: "bg-violet-500/20" },
          { label: "With LinkedIn", value: loading ? "—" : buyers.filter((b) => b.linkedin_url).length.toLocaleString(), icon: Linkedin, color: "bg-blue-500/20" },
          {
            label: "Companies",
            value: loading ? "—" : new Set(buyers.map((b) => b.companies?.domain).filter(Boolean)).size.toLocaleString(),
            icon: Building2,
            color: "bg-emerald-500/20",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-2">
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
          placeholder="Search by name, title, company, or email…"
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
            <span className="text-sm">Loading contacts…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm font-medium">
              {search ? "No contacts match your search" : "No contacts discovered yet"}
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
                "Open a campaign's Pipeline tab and run Skill 4 to find decision-makers."
              )}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                {["Name", "Title", "Company", "Email", "LinkedIn", "Added"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-white text-sm">
                      {b.first_name} {b.last_name}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-neutral-400 text-xs max-w-[180px] truncate">
                    {b.title || "—"}
                  </td>
                  <td className="px-5 py-4">
                    {b.companies ? (
                      <div>
                        <div className="text-neutral-300 text-sm">{b.companies.name}</div>
                        <div className="text-neutral-600 text-xs font-mono">{b.companies.domain}</div>
                      </div>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {b.email ? (
                      <span className="flex items-center text-xs font-mono text-neutral-300">
                        {b.email}
                        <CopyButton text={b.email} />
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {b.linkedin_url ? (
                      <a
                        href={b.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        Profile <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-neutral-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(b.created_at).toLocaleDateString()}
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
