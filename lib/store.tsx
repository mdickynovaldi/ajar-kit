"use client";

/* AjarKit — store global DUAL-MODE.
   • MODE MOCK   : env Supabase kosong → data mock + persistensi localStorage
                   (perilaku fase frontend, tidak berubah).
   • MODE SUPABASE: NEXT_PUBLIC_SUPABASE_URL + ANON_KEY terisi → auth & data
                   nyata dari Postgres (RLS). Mutasi kredit/pembayaran lewat
                   RPC SECURITY DEFINER (lihat supabase/migrations/0001_init.sql)
                   sehingga validasi saldo terjadi DI SERVER (prd.md §0.6, §10).
   API useApp() identik di kedua mode; halaman tidak perlu tahu mode aktif.
   Ruang Sekolah/Prodi (M3) ikut dual-mode: workspace/anggota/review nyata di
   Supabase (lihat migrations 0003), fixture di mode mock. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppNotification,
  DocContent,
  DocType,
  Document,
  Member,
  Plan,
  QualityMode,
  ReviewItem,
  Role,
  Transaction,
  User,
  WorkspaceSummary,
} from "./types";
import { initialsOf, relativeLabel, shortDate } from "./format";
import { getSupabase, SUPABASE_ENABLED } from "./supabase/client";
import {
  INITIAL_CREDITS,
  MOCK_DOCUMENTS,
  MOCK_NOTIFICATIONS,
  MOCK_TRANSACTIONS,
  MOCK_USERS,
  MOCK_WORKSPACE,
} from "@/data/mock";

const STORAGE_KEY = "ajarkit-state-v1";
/** kode referral tertunda (diisi dari /daftar?ref=…), diterapkan setelah login */
const REF_STORAGE_KEY = "ajarkit-ref";

/* ============================== state ============================== */

interface PersistedState {
  role: Role;
  credits: number;
  plan: Plan;
  onboardingDone: boolean;
  documents: Document[];
  notifications: AppNotification[];
  transactions: Transaction[];
  members: Member[];
  /** email yang diisi saat daftar (utk layar verifikasi) */
  pendingEmail: string | null;
  /** isian profil dari onboarding/pengaturan, merge di atas mock per role */
  profileOverrides: { guru: Partial<User>; dosen: Partial<User> };
  /** mode mock: keputusan review (Setujui/Minta revisi) per id review */
  reviewOverrides: Record<string, { status: "disetujui" | "revisi"; catatan?: string }>;
}

const DEFAULT_STATE: PersistedState = {
  role: "guru",
  credits: INITIAL_CREDITS,
  plan: "free",
  onboardingDone: true,
  documents: MOCK_DOCUMENTS,
  notifications: MOCK_NOTIFICATIONS,
  transactions: MOCK_TRANSACTIONS,
  members: MOCK_WORKSPACE.members,
  pendingEmail: null,
  profileOverrides: { guru: {}, dosen: {} },
  reviewOverrides: {},
};

/** state awal mode Supabase: kosong sampai sesi & data dimuat */
const EMPTY_SUPABASE_STATE: PersistedState = {
  ...DEFAULT_STATE,
  credits: 0,
  documents: [],
  notifications: [],
  transactions: [],
  onboardingDone: true,
};

type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface GenerationInput {
  jobRef: string;
  cost: number;
  docs: {
    title: string;
    type: DocType;
    subject: string;
    jenjang: string;
    qualityMode: QualityMode;
    content: DocContent | null;
    /** khusus modul_ajar: jumlah pertemuan yang diminta (1-16) */
    pertemuanCount?: number;
    /** khusus modul_ajar: sertakan lampiran LKPD di dalam dokumen */
    includeLkpd?: boolean;
  }[];
  notifTitle: string;
  notifBody: string;
}

export interface ReferralInfo {
  code: string;
  invited: number;
  /** teman yang sudah melakukan pembelian pertama (ledger 'referral_conversion') */
  converted: number;
  earned: number;
}

export interface PaymentInput {
  orderId: string;
  type: "topup" | "subscription";
  label: string;
  method: Transaction["method"];
  amount: number;
  /** kredit yang ditambahkan (topup); 0 utk subscription */
  credits: number;
}

export interface AppStore extends PersistedState {
  /** "mock" bila env Supabase kosong; "supabase" bila terisi */
  mode: "mock" | "supabase";
  /** ruang milik user aktif; null = belum punya/diundang ke ruang */
  workspace: WorkspaceSummary | null;
  /** antrean review ruang (mock: merge fixture + dokumen menunggu_review) */
  reviews: ReviewItem[];
  /** mode mock selalu "signedIn" (auth disimulasikan) */
  authStatus: AuthStatus;
  hydrated: boolean;
  user: User;
  unreadCount: number;
  setRole: (role: Role) => void;
  setPlan: (plan: Plan) => void;
  setOnboardingDone: (done: boolean) => void;
  setPendingEmail: (email: string | null) => void;
  updateProfile: (patch: Partial<User>) => void;
  addMember: (m: Member) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;
  /** Buat ruang baru (mode Supabase: insert + trigger admin otomatis). */
  createWorkspace: (nama: string) => Promise<void>;
  /** Undang anggota via email terdaftar; error mis. "EMAIL_BELUM_TERDAFTAR". */
  inviteMember: (
    email: string,
    role: "admin" | "anggota",
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Terima undangan ruang (status diundang → aktif). */
  acceptInvite: () => Promise<void>;
  /** Ajukan dokumen utk ditinjau: status + (Supabase) baris reviews + notifikasi admin. */
  submitForReview: (documentId: string) => Promise<void>;
  /** Keputusan admin atas review: status review + dokumen + notifikasi pemilik. */
  decideReview: (
    reviewId: string,
    decision: "disetujui" | "revisi",
    catatan?: string,
  ) => Promise<void>;
  addCredits: (n: number) => void;
  deductCredits: (n: number) => void;
  /** @returns id final dokumen (mode Supabase memakai UUID baru) */
  addDocument: (doc: Document) => string;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  duplicateDocument: (id: string) => string | null;
  addNotification: (n: Omit<AppNotification, "id" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  /** Generate sukses: potong kredit + buat dokumen + notifikasi — ATOMIK
      (mode Supabase: RPC generate_documents; gagal saldo → throw
      Error("KREDIT_TIDAK_CUKUP") dan kredit utuh). */
  completeGeneration: (
    input: GenerationInput,
  ) => Promise<{ id: string; title: string; type: DocType }[]>;
  /** Pembayaran simulasi lunas: transaksi + kredit/plan — idempoten via orderId. */
  completePayment: (input: PaymentInput) => Promise<void>;
  /** Mulai pembayaran NYATA via Pakasir (server /api/payments/create).
      "simulated" = Pakasir belum dikonfigurasi → pakai alur simulasi yang ada. */
  startCheckout: (
    input: PaymentInput,
  ) => Promise<
    { mode: "simulated" } | { mode: "gateway"; orderId: string; paymentUrl: string }
  >;
  /** Tarik ulang saldo/transaksi/plan dari server (setelah webhook settle). */
  refreshFromServer: () => Promise<void>;
  /** Simpan kode referral tertunda (localStorage 'ajarkit-ref'); diterapkan
      otomatis via RPC apply_referral_code begitu user login (mode Supabase). */
  setPendingReferral: (code: string | null) => void;
  /** Statistik referral utk halaman "Ajak Teman" (mock: data dummy;
      Supabase: RPC referral_stats, fallback select referral_code). */
  getReferralInfo: () => Promise<ReferralInfo | null>;
  /** Token akses sesi aktif utk header Authorization Bearer ke API server
      (mis. /api/export/*). Mode mock / belum login → null. */
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  toggleTheme: () => void;
  resetMock: () => void;
}

const Ctx = createContext<AppStore | null>(null);

/* ====================== mapping baris Supabase ====================== */

interface ProfileRow {
  id: string;
  nama: string;
  email: string;
  role: Role;
  jenjang: string | null;
  kelas: string | null;
  mapel: string[] | null;
  sekolah: string | null;
  pt: string | null;
  prodi: string | null;
  mata_kuliah: string[] | null;
  credits: number;
  plan: Plan;
  onboarding_done: boolean;
  instansi_induk: string | null;
  nama_instansi: string | null;
  alamat_instansi: string | null;
  kontak_instansi: string | null;
  logo_instansi: string | null;
  kota: string | null;
  nip: string | null;
  pimpinan_jabatan: string | null;
  pimpinan_nama: string | null;
  pimpinan_nip: string | null;
}

interface DocumentRow {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  type: DocType;
  title: string;
  status: Document["status"];
  subject: string;
  jenjang: string;
  quality_mode: QualityMode;
  content: DocContent | null;
  updated_at: string;
}

function userFromProfile(p: ProfileRow): User {
  const nama = p.nama || p.email.split("@")[0] || "Pengguna";
  return {
    id: p.id,
    nama,
    email: p.email,
    role: p.role,
    initials: initialsOf(nama),
    jenjang: p.jenjang ?? undefined,
    kelas: p.kelas ?? undefined,
    mapel: p.mapel ?? undefined,
    sekolah: p.sekolah ?? undefined,
    pt: p.pt ?? undefined,
    prodi: p.prodi ?? undefined,
    mataKuliah: p.mata_kuliah ?? undefined,
    plan: p.plan,
    instansiInduk: p.instansi_induk ?? undefined,
    namaInstansi: p.nama_instansi ?? undefined,
    alamatInstansi: p.alamat_instansi ?? undefined,
    kontakInstansi: p.kontak_instansi ?? undefined,
    logoInstansi: p.logo_instansi ?? undefined,
    kota: p.kota ?? undefined,
    nip: p.nip ?? undefined,
    pimpinanJabatan: p.pimpinan_jabatan ?? undefined,
    pimpinanNama: p.pimpinan_nama ?? undefined,
    pimpinanNip: p.pimpinan_nip ?? undefined,
  };
}

function docFromRow(r: DocumentRow, ownerName: string): Document {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    subject: r.subject,
    jenjang: r.jenjang,
    updatedAt: r.updated_at,
    updatedLabel: relativeLabel(r.updated_at),
    ownerId: r.owner_id,
    ownerName,
    workspaceId: r.workspace_id ?? undefined,
    qualityMode: r.quality_mode,
    content: r.content,
  };
}

function notifFromRow(r: {
  id: string;
  type: string;
  payload: { title?: string; body?: string };
  read_at: string | null;
  created_at: string;
}): AppNotification {
  const known = ["dokumen", "review", "kredit", "langganan", "info"];
  return {
    id: r.id,
    type: (known.includes(r.type) ? r.type : "info") as AppNotification["type"],
    title: r.payload?.title ?? "Notifikasi",
    body: r.payload?.body ?? "",
    timeLabel: relativeLabel(r.created_at),
    read: r.read_at !== null,
  };
}

function trxFromRow(r: {
  id: string;
  type: Transaction["type"];
  label: string;
  method: Transaction["method"];
  amount: number;
  status: Transaction["status"];
  created_at: string;
}): Transaction {
  return {
    id: r.id,
    type: r.type,
    label: r.label || (r.type === "topup" ? "Top-up kredit" : "Langganan"),
    method: r.method,
    amount: Number(r.amount),
    status: r.status,
    date: shortDate(r.created_at),
  };
}

/* Mode mock: gabungkan review fixture + dokumen ws-1 berstatus review,
   lalu terapkan keputusan admin (reviewOverrides). */
function mockReviews(
  documents: Document[],
  overrides: PersistedState["reviewOverrides"],
): ReviewItem[] {
  const applyOv = (r: ReviewItem): ReviewItem => {
    const ov = overrides[r.id];
    return ov ? { ...r, status: ov.status, catatan: ov.catatan ?? r.catatan } : r;
  };
  const base = MOCK_WORKSPACE.reviews.map(applyOv);
  const covered = new Set(base.map((r) => r.documentId));
  const statusMap: Record<string, ReviewItem["status"]> = {
    menunggu_review: "menunggu",
    disetujui: "disetujui",
    revisi: "revisi",
  };
  const dynamic = documents
    .filter(
      (d) =>
        d.workspaceId === MOCK_WORKSPACE.id &&
        d.status in statusMap &&
        !covered.has(d.id),
    )
    .map(
      (d): ReviewItem =>
        applyOv({
          id: `rv-doc-${d.id}`,
          documentId: d.id,
          title: d.title,
          docType: d.type,
          pembuat: d.ownerName,
          initials: initialsOf(d.ownerName),
          tanggal: d.updatedLabel,
          status: statusMap[d.status],
        }),
    );
  return [...dynamic, ...base];
}

const newId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  // fallback UUID v4 valid (lingkungan tanpa crypto.randomUUID, mis. HTTP
  // non-localhost) — kolom id di Postgres bertipe uuid
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/* ============================ provider ============================ */

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mode: "mock" | "supabase" = SUPABASE_ENABLED ? "supabase" : "mock";
  const [state, setState] = useState<PersistedState>(
    mode === "supabase" ? EMPTY_SUPABASE_STATE : DEFAULT_STATE,
  );
  const [hydrated, setHydrated] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    mode === "supabase" ? "loading" : "signedIn",
  );
  const [supaUser, setSupaUser] = useState<User | null>(null);
  // kode referral tertunda (dari /daftar?ref=…) — diterapkan setelah login
  const [pendingReferral, setPendingReferralState] = useState<string | null>(null);
  // kode yang sudah dicoba diterapkan pada sesi ini (cegah panggilan ganda)
  const refAttemptedRef = useRef<string | null>(null);
  // mode Supabase: ruang + antrean review nyata (mock: diturunkan di getter)
  const [wsInfo, setWsInfo] = useState<WorkspaceSummary | null>(null);
  const [wsReviews, setWsReviews] = useState<ReviewItem[]>([]);
  const loadedRef = useRef(false);
  const uidRef = useRef<string | null>(null);
  // snapshot state terkini utk dibaca event handler tanpa closure basi
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  /* ---------- MODE MOCK: hidrasi & persistensi localStorage ---------- */
  useEffect(() => {
    if (mode !== "mock") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrasi localStorage satu kali; render pertama wajib sama dengan SSR
        setState((s) => ({ ...s, ...saved }));
      }
    } catch {
      /* abaikan state korup */
    }
    loadedRef.current = true;
    setHydrated(true);
  }, [mode]);

  useEffect(() => {
    if (mode !== "mock" || !loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* penyimpanan penuh — abaikan */
    }
  }, [state, mode]);

  /* Muat ruang + anggota + antrean review (mode Supabase) — dipanggil saat
     login dan setelah mutasi ruang. */
  const reloadWorkspace = useCallback(async () => {
    if (mode !== "supabase" || !uidRef.current) return;
    const sb = getSupabase()!;
    const uid = uidRef.current;

    const { data: mem } = await sb
      .from("memberships")
      .select(
        "id, role, status, workspaces(id, nama, plan, seats, approval_required)",
      )
      .eq("user_id", uid)
      .neq("status", "nonaktif")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    interface WsRow {
      id: string;
      nama: string;
      plan: string | null;
      seats: number | null;
      approval_required: boolean | null;
    }
    const m = mem as
      | { id: string; role: "admin" | "anggota"; status: string; workspaces: WsRow | null }
      | null;
    if (!m?.workspaces) {
      setWsInfo(null);
      setWsReviews([]);
      return;
    }
    const ws = m.workspaces;
    setWsInfo({
      id: ws.id,
      nama: ws.nama,
      plan: ws.plan ?? "school",
      seats: ws.seats ?? 10,
      approvalRequired: !!ws.approval_required,
      myRole: m.role,
      myStatus: m.status === "diundang" ? "diundang" : "aktif",
    });

    const [memberRes, reviewRes] = await Promise.all([
      sb
        .from("memberships")
        .select("id, role, status, user_id, profiles(nama, email, mapel, prodi)")
        .eq("workspace_id", ws.id)
        .order("created_at", { ascending: true }),
      sb
        .from("reviews")
        .select(
          "id, status, comments, created_at, document_id, documents(title, type, owner_id, profiles(nama))",
        )
        .eq("workspace_id", ws.id)
        .order("created_at", { ascending: false }),
    ]);

    interface MemberRow {
      id: string;
      role: "admin" | "anggota";
      status: "aktif" | "diundang" | "nonaktif";
      user_id: string;
      profiles: {
        nama: string;
        email: string;
        mapel: string[] | null;
        prodi: string | null;
      } | null;
    }
    setState((s) => ({
      ...s,
      members: ((memberRes.data ?? []) as unknown as MemberRow[]).map((r) => {
        const nama = r.profiles?.nama || r.profiles?.email?.split("@")[0] || "Anggota";
        return {
          id: r.id,
          userId: r.user_id,
          nama,
          initials: initialsOf(nama),
          email: r.profiles?.email ?? "",
          role: r.role,
          mapel: r.profiles?.mapel?.length
            ? r.profiles.mapel.slice(0, 2).join(", ")
            : (r.profiles?.prodi ?? "—"),
          status: r.status,
          dokumen: 0,
          pemakaian: "—",
        };
      }),
    }));

    interface ReviewRow {
      id: string;
      status: "menunggu" | "disetujui" | "revisi";
      comments: { note?: string } | null;
      created_at: string;
      document_id: string;
      documents: {
        title: string;
        type: DocType;
        owner_id: string;
        profiles: { nama: string } | null;
      } | null;
    }
    setWsReviews(
      ((reviewRes.data ?? []) as unknown as ReviewRow[]).map((r) => {
        const pembuat = r.documents?.profiles?.nama ?? "Anggota";
        return {
          id: r.id,
          documentId: r.document_id,
          ownerId: r.documents?.owner_id,
          title: r.documents?.title ?? "(dokumen terhapus)",
          docType: r.documents?.type ?? "modul_ajar",
          pembuat,
          initials: initialsOf(pembuat),
          tanggal: shortDate(r.created_at),
          status: r.status,
          catatan: r.comments?.note,
        };
      }),
    );
  }, [mode]);


  /* ---------- MODE SUPABASE: sesi auth + muat data ---------- */
  useEffect(() => {
    if (mode !== "supabase") return;
    const sb = getSupabase()!;
    let cancelled = false;

    async function loadAll(uid: string) {
      uidRef.current = uid;
      const [profileRes, docsRes, notifRes, trxRes] = await Promise.all([
        sb.from("profiles").select("*").eq("id", uid).single(),
        sb
          .from("documents")
          .select("*")
          .order("updated_at", { ascending: false }),
        sb
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        sb
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      const profile = profileRes.data as ProfileRow | null;
      if (!profile) {
        // profil belum ada (trigger gagal?) — tetap masuk dgn data minim
        console.error("AjarKit: profil tidak ditemukan", profileRes.error);
        setAuthStatus("signedIn");
        setHydrated(true);
        return;
      }
      const u = userFromProfile(profile);
      setSupaUser(u);
      setState({
        ...EMPTY_SUPABASE_STATE,
        role: profile.role,
        credits: profile.credits,
        plan: profile.plan,
        onboardingDone: profile.onboarding_done,
        documents: ((docsRes.data as DocumentRow[]) ?? []).map((d) =>
          docFromRow(d, d.owner_id === uid ? u.nama : ""),
        ),
        notifications: (notifRes.data ?? []).map(notifFromRow),
        transactions: (trxRes.data ?? []).map(trxFromRow),
      });
      setAuthStatus("signedIn");
      setHydrated(true);
      void reloadWorkspace(); // ruang + anggota + review (M3)
    }

    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) void loadAll(data.session.user.id);
      else {
        setAuthStatus("signedOut");
        setHydrated(true);
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session?.user) {
        if (uidRef.current !== session.user.id) void loadAll(session.user.id);
      } else if (event === "SIGNED_OUT") {
        uidRef.current = null;
        setSupaUser(null);
        setWsInfo(null);
        setWsReviews([]);
        setState(EMPTY_SUPABASE_STATE);
        setAuthStatus("signedOut");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mode, reloadWorkspace]);

  /** update lokal + tulis kolom profil ke Supabase (fire-and-forget) */
  const patchProfile = useCallback(
    (cols: Record<string, unknown>) => {
      if (mode !== "supabase" || !uidRef.current) return;
      const sb = getSupabase()!;
      void sb
        .from("profiles")
        .update(cols)
        .eq("id", uidRef.current)
        .then(({ error }) => {
          if (error) console.error("AjarKit: gagal simpan profil", error);
        });
    },
    [mode],
  );

  /* ============================ aksi ============================ */

  const setRole = useCallback(
    (role: Role) => {
      setState((s) => ({ ...s, role }));
      setSupaUser((u) => (u ? { ...u, role } : u));
      patchProfile({ role });
    },
    [patchProfile],
  );

  const setPlan = useCallback(
    (plan: Plan) => {
      setState((s) => ({ ...s, plan }));
      setSupaUser((u) => (u ? { ...u, plan } : u));
      patchProfile({ plan }); // TODO produksi: plan hanya via webhook pembayaran
    },
    [patchProfile],
  );

  const setOnboardingDone = useCallback(
    (done: boolean) => {
      setState((s) => ({ ...s, onboardingDone: done }));
      patchProfile({ onboarding_done: done });
    },
    [patchProfile],
  );

  const setPendingEmail = useCallback((pendingEmail: string | null) => {
    setState((s) => ({ ...s, pendingEmail }));
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<User>) => {
      setState((s) => ({
        ...s,
        profileOverrides: {
          ...s.profileOverrides,
          [s.role]: { ...s.profileOverrides[s.role], ...patch },
        },
      }));
      setSupaUser((u) => (u ? { ...u, ...patch } : u));
      const cols: Record<string, unknown> = {};
      if (patch.nama !== undefined) cols.nama = patch.nama;
      if (patch.jenjang !== undefined) cols.jenjang = patch.jenjang;
      if (patch.kelas !== undefined) cols.kelas = patch.kelas;
      if (patch.mapel !== undefined) cols.mapel = patch.mapel;
      if (patch.sekolah !== undefined) cols.sekolah = patch.sekolah;
      if (patch.pt !== undefined) cols.pt = patch.pt;
      if (patch.prodi !== undefined) cols.prodi = patch.prodi;
      if (patch.mataKuliah !== undefined) cols.mata_kuliah = patch.mataKuliah;
      if (patch.instansiInduk !== undefined) cols.instansi_induk = patch.instansiInduk;
      if (patch.namaInstansi !== undefined) cols.nama_instansi = patch.namaInstansi;
      if (patch.alamatInstansi !== undefined) cols.alamat_instansi = patch.alamatInstansi;
      if (patch.kontakInstansi !== undefined) cols.kontak_instansi = patch.kontakInstansi;
      if (patch.logoInstansi !== undefined) cols.logo_instansi = patch.logoInstansi;
      if (patch.kota !== undefined) cols.kota = patch.kota;
      if (patch.nip !== undefined) cols.nip = patch.nip;
      if (patch.pimpinanJabatan !== undefined) cols.pimpinan_jabatan = patch.pimpinanJabatan;
      if (patch.pimpinanNama !== undefined) cols.pimpinan_nama = patch.pimpinanNama;
      if (patch.pimpinanNip !== undefined) cols.pimpinan_nip = patch.pimpinanNip;
      if (Object.keys(cols).length) patchProfile(cols);
    },
    [patchProfile],
  );

  /* ----- anggota & ruang (M3: nyata di mode Supabase) ----- */
  const addMember = useCallback((m: Member) => {
    setState((s) => ({ ...s, members: [...s.members, m] }));
  }, []);

  const updateMember = useCallback(
    (id: string, patch: Partial<Member>) => {
      setState((s) => ({
        ...s,
        members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
      if (mode === "supabase") {
        const cols: Record<string, unknown> = {};
        if (patch.role !== undefined) cols.role = patch.role;
        if (patch.status !== undefined) cols.status = patch.status;
        if (!Object.keys(cols).length) return;
        const sb = getSupabase()!;
        void sb
          .from("memberships")
          .update(cols)
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal update anggota", error);
          });
      }
    },
    [mode],
  );

  const removeMember = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        members: s.members.filter((m) => m.id !== id),
      }));
      if (mode === "supabase") {
        const sb = getSupabase()!;
        void sb
          .from("memberships")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal hapus anggota", error);
          });
      }
    },
    [mode],
  );

  const createWorkspace = useCallback(
    async (nama: string) => {
      if (mode !== "supabase" || !uidRef.current) return; // mock: fixture sudah ada
      const sb = getSupabase()!;
      const { error } = await sb
        .from("workspaces")
        .insert({ nama: nama.trim().slice(0, 80), owner_id: uidRef.current });
      if (error) throw new Error(error.message);
      // trigger on_workspace_created menjadikan pembuat admin aktif
      await reloadWorkspace();
    },
    [mode, reloadWorkspace],
  );

  const inviteMember = useCallback(
    async (
      email: string,
      role: "admin" | "anggota",
    ): Promise<{ ok: boolean; error?: string }> => {
      if (mode === "supabase") {
        const ws = wsInfo;
        if (!ws) return { ok: false, error: "Kamu belum punya ruang." };
        const sb = getSupabase()!;
        const { error } = await sb.rpc("invite_member", {
          p_workspace: ws.id,
          p_email: email,
          p_role: role,
        });
        if (error) {
          if (error.message.includes("EMAIL_BELUM_TERDAFTAR"))
            return {
              ok: false,
              error: "Email belum terdaftar di AjarKit. Minta dia daftar dulu, ya.",
            };
          if (error.message.includes("BUKAN_ADMIN"))
            return { ok: false, error: "Hanya admin ruang yang bisa mengundang." };
          console.error("AjarKit: invite gagal", error);
          return { ok: false, error: "Gagal mengirim undangan. Coba lagi, ya." };
        }
        await reloadWorkspace();
        return { ok: true };
      }
      // mock — anggota baru berstatus diundang dari email
      const base = email.split("@")[0] || "Anggota Baru";
      const nama =
        base
          .split(/[._\-+]+/)
          .filter(Boolean)
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" ") || "Anggota Baru";
      addMember({
        id: `m-${Date.now()}`,
        nama,
        initials: initialsOf(nama),
        email,
        role,
        mapel: "—",
        status: "diundang",
        dokumen: 0,
        pemakaian: "—",
      });
      return { ok: true };
    },
    [mode, wsInfo, addMember, reloadWorkspace],
  );

  const acceptInvite = useCallback(async () => {
    if (mode !== "supabase" || !wsInfo || !uidRef.current) return;
    const sb = getSupabase()!;
    const { error } = await sb
      .from("memberships")
      .update({ status: "aktif" })
      .eq("workspace_id", wsInfo.id)
      .eq("user_id", uidRef.current);
    if (error) throw new Error(error.message);
    await reloadWorkspace();
  }, [mode, wsInfo, reloadWorkspace]);

  /* ----- kredit ----- */
  const addCredits = useCallback(
    (n: number) => {
      if (mode === "supabase") {
        // kredit hanya boleh bertambah lewat completePayment (server-side)
        console.warn("AjarKit: addCredits diabaikan di mode Supabase");
        return;
      }
      setState((s) => ({ ...s, credits: s.credits + n }));
    },
    [mode],
  );

  const deductCredits = useCallback(
    (n: number) => {
      setState((s) => ({ ...s, credits: Math.max(0, s.credits - n) }));
      if (mode === "supabase" && uidRef.current) {
        const sb = getSupabase()!;
        void sb
          .rpc("spend_credits", { p_amount: n, p_ref: `spend-${newId()}` })
          .then(({ data, error }) => {
            if (error) {
              console.error("AjarKit: spend_credits gagal", error);
              // pulihkan saldo lokal dari server
              void sb.rpc("credit_balance").then(({ data: bal }) => {
                if (typeof bal === "number")
                  setState((s) => ({ ...s, credits: bal }));
              });
            } else if (typeof data === "number") {
              setState((s) => ({ ...s, credits: data }));
            }
          });
      }
    },
    [mode],
  );

  /* ----- dokumen ----- */
  const addDocument = useCallback(
    (doc: Document): string => {
      if (mode === "supabase") {
        const id = newId();
        const withId = { ...doc, id };
        setState((s) => ({ ...s, documents: [withId, ...s.documents] }));
        const sb = getSupabase()!;
        void sb
          .from("documents")
          .insert({
            id,
            owner_id: uidRef.current,
            type: doc.type,
            title: doc.title,
            status: doc.status,
            subject: doc.subject,
            jenjang: doc.jenjang,
            quality_mode: doc.qualityMode,
            content: doc.content,
          })
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal simpan dokumen", error);
          });
        return id;
      }
      setState((s) => ({ ...s, documents: [doc, ...s.documents] }));
      return doc.id;
    },
    [mode],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<Document>) => {
      setState((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id
            ? { ...d, ...patch, updatedLabel: "Baru saja" }
            : d,
        ),
      }));
      if (mode === "supabase") {
        const cols: Record<string, unknown> = {};
        if (patch.title !== undefined) cols.title = patch.title;
        if (patch.status !== undefined) cols.status = patch.status;
        if (patch.subject !== undefined) cols.subject = patch.subject;
        if (patch.jenjang !== undefined) cols.jenjang = patch.jenjang;
        if (patch.content !== undefined) cols.content = patch.content;
        if (patch.workspaceId !== undefined)
          cols.workspace_id = patch.workspaceId;
        if (!Object.keys(cols).length) return;
        const sb = getSupabase()!;
        void sb
          .from("documents")
          .update(cols)
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal update dokumen", error);
          });
      }
    },
    [mode],
  );

  const removeDocument = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        documents: s.documents.filter((d) => d.id !== id),
      }));
      if (mode === "supabase") {
        const sb = getSupabase()!;
        void sb
          .from("documents")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal hapus dokumen", error);
          });
      }
    },
    [mode],
  );

  const duplicateDocument = useCallback(
    (id: string): string | null => {
      // baca dari snapshot (bukan di dalam updater setState — updater harus murni)
      const src = stateRef.current.documents.find((d) => d.id === id);
      if (!src) return null;
      const createdId = mode === "supabase" ? newId() : `doc-${Date.now()}`;
      const copy: Document = {
        ...src,
        id: createdId,
        title: `${src.title} (salinan)`,
        status: "draft",
        updatedLabel: "Baru saja",
        updatedAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, documents: [copy, ...s.documents] }));
      if (mode === "supabase") {
        const sb = getSupabase()!;
        void sb
          .from("documents")
          .insert({
            id: copy.id,
            owner_id: uidRef.current,
            type: copy.type,
            title: copy.title,
            status: copy.status,
            subject: copy.subject,
            jenjang: copy.jenjang,
            quality_mode: copy.qualityMode,
            content: copy.content,
          })
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal duplikat dokumen", error);
          });
      }
      return createdId;
    },
    [mode],
  );

  /* ----- notifikasi ----- */
  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "read">) => {
      const id = mode === "supabase" ? newId() : `n-${Date.now()}`;
      setState((s) => ({
        ...s,
        notifications: [{ ...n, id, read: false }, ...s.notifications],
      }));
      if (mode === "supabase" && uidRef.current) {
        const sb = getSupabase()!;
        void sb
          .from("notifications")
          .insert({
            id,
            user_id: uidRef.current,
            type: n.type,
            payload: { title: n.title, body: n.body },
          })
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal simpan notifikasi", error);
          });
      }
    },
    [mode],
  );

  const submitForReview = useCallback(
    async (documentId: string) => {
      const doc = stateRef.current.documents.find((d) => d.id === documentId);
      if (!doc) return;
      const notifBody = `"${doc.title}" menunggu persetujuan admin ruang.`;

      if (mode === "supabase") {
        const ws = wsInfo;
        if (!ws) throw new Error("BELUM_PUNYA_RUANG");
        const sb = getSupabase()!;
        // status + tempelkan dokumen ke ruang (sinkron via updateDocument)
        updateDocument(documentId, {
          status: "menunggu_review",
          workspaceId: ws.id,
        });
        const { error } = await sb
          .from("reviews")
          .insert({ document_id: documentId, workspace_id: ws.id });
        if (error) {
          console.error("AjarKit: gagal buat review", error);
          throw new Error(error.message);
        }
        // beri tahu para admin ruang
        for (const m of stateRef.current.members.filter(
          (x) => x.role === "admin" && x.status === "aktif" && x.userId,
        )) {
          // PENTING: rpc() supabase-js lazy — request baru terkirim saat
          // .then() dipanggil; "void rpc(...)" saja tidak mengirim apa pun.
          void sb
            .rpc("notify_member", {
              p_user: m.userId,
              p_type: "review",
              p_title: "Pengajuan review baru",
              p_body: `"${doc.title}" menunggu tinjauanmu.`,
            })
            .then(({ error: nErr }) => {
              if (nErr) console.error("AjarKit: notifikasi admin gagal", nErr);
            });
        }
        await reloadWorkspace();
        return;
      }

      // mock
      updateDocument(documentId, {
        status: "menunggu_review",
        workspaceId: MOCK_WORKSPACE.id,
      });
      addNotification({
        type: "review",
        title: "Diajukan untuk ditinjau",
        body: notifBody,
        timeLabel: "Baru saja",
      });
    },
    [mode, wsInfo, updateDocument, addNotification, reloadWorkspace],
  );

  const decideReview = useCallback(
    async (
      reviewId: string,
      decision: "disetujui" | "revisi",
      catatan?: string,
    ) => {
      const newDocStatus = decision === "disetujui" ? "disetujui" : "revisi";

      if (mode === "supabase") {
        const rv = wsReviews.find((r) => r.id === reviewId);
        if (!rv) return;
        const sb = getSupabase()!;
        const { error } = await sb
          .from("reviews")
          .update({
            status: decision,
            comments: catatan ? { note: catatan } : null,
          })
          .eq("id", reviewId);
        if (error) throw new Error(error.message);
        updateDocument(rv.documentId, { status: newDocStatus });
        // beri tahu pemilik dokumen (ownerId dari baris review — dokumen
        // anggota lain belum tentu ada di daftar dokumen lokal admin)
        const owner =
          rv.ownerId ??
          stateRef.current.documents.find((d) => d.id === rv.documentId)
            ?.ownerId;
        if (owner && owner !== uidRef.current) {
          void sb
            .rpc("notify_member", {
              p_user: owner,
              p_type: "review",
              p_title:
                decision === "disetujui"
                  ? "Dokumen disetujui ✅"
                  : "Diminta revisi",
              p_body: `"${rv.title}"${catatan ? ` — ${catatan}` : ""}`,
            })
            .then(({ error: nErr }) => {
              if (nErr) console.error("AjarKit: notifikasi pemilik gagal", nErr);
            });
        }
        await reloadWorkspace();
        return;
      }

      // mock — simpan keputusan + sinkron status dokumen + notifikasi
      const rv = mockReviews(
        stateRef.current.documents,
        stateRef.current.reviewOverrides,
      ).find((r) => r.id === reviewId);
      if (!rv) return;
      setState((s) => ({
        ...s,
        reviewOverrides: {
          ...s.reviewOverrides,
          [reviewId]: { status: decision, catatan },
        },
      }));
      updateDocument(rv.documentId, { status: newDocStatus });
      addNotification({
        type: "review",
        title:
          decision === "disetujui" ? "Dokumen disetujui ✅" : "Diminta revisi",
        body: `"${rv.title}"${catatan ? ` — ${catatan}` : ""}`,
        timeLabel: "Baru saja",
      });
    },
    [mode, wsReviews, updateDocument, addNotification, reloadWorkspace],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      }));
      if (mode === "supabase") {
        const sb = getSupabase()!;
        void sb
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("AjarKit: gagal tandai dibaca", error);
          });
      }
    },
    [mode],
  );

  const markAllNotificationsRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    if (mode === "supabase" && uidRef.current) {
      const sb = getSupabase()!;
      void sb
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", uidRef.current)
        .is("read_at", null)
        .then(({ error }) => {
          if (error) console.error("AjarKit: gagal tandai semua", error);
        });
    }
  }, [mode]);

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id">) => {
      if (mode === "supabase") {
        // transaksi hanya lewat completePayment (server-side)
        console.warn("AjarKit: addTransaction diabaikan di mode Supabase");
        return;
      }
      setState((s) => ({
        ...s,
        transactions: [{ ...t, id: `trx-${Date.now()}` }, ...s.transactions],
      }));
    },
    [mode],
  );

  /* ----- alur atomik ----- */

  const completeGeneration = useCallback(
    async (input: GenerationInput) => {
      if (mode === "supabase") {
        const sb = getSupabase()!;

        // 1) Coba jalur AI nyata di server (/api/generate → OpenRouter →
        //    RPC sebagai user). "simulated" = AI belum dikonfigurasi.
        let rows: { id: string; title: string; type: DocType; content?: DocContent | null }[] | null =
          null;
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              jobRef: input.jobRef,
              cost: input.cost,
              docs: input.docs.map((d) => ({
                title: d.title,
                type: d.type,
                subject: d.subject,
                jenjang: d.jenjang,
                qualityMode: d.qualityMode,
                pertemuanCount: d.pertemuanCount,
                includeLkpd: d.includeLkpd,
                fallbackContent: d.content,
              })),
            }),
          });
          if (res.status === 402) throw new Error("KREDIT_TIDAK_CUKUP");
          const json = (await res.json().catch(() => null)) as
            | { mode: "ai"; docs: typeof rows }
            | { mode: "simulated" }
            | { error?: string }
            | null;
          if (res.ok && json && "mode" in json && json.mode === "ai") {
            rows = json.docs;
          } else if (res.ok && json && "mode" in json && json.mode === "simulated") {
            rows = null; // lanjut ke jalur RPC langsung di bawah
          } else {
            throw new Error(
              (json && "error" in json && json.error) || "GENERATE_GAGAL",
            );
          }
        }

        // 2) Fallback: RPC langsung dgn konten contoh (AI belum aktif)
        if (!rows) {
          const { data, error } = await sb.rpc("generate_documents", {
            p_job_ref: input.jobRef,
            p_cost: input.cost,
            p_docs: input.docs.map((d) => ({
              title: d.title,
              type: d.type,
              subject: d.subject,
              jenjang: d.jenjang,
              quality_mode: d.qualityMode,
              content: d.content,
            })),
          });
          if (error) {
            if (error.message.includes("KREDIT_TIDAK_CUKUP"))
              throw new Error("KREDIT_TIDAK_CUKUP");
            throw new Error(error.message);
          }
          rows = (data ?? []) as { id: string; title: string; type: DocType }[];
        }
        const nowIso = new Date().toISOString();
        const ownerName = supaUser?.nama ?? "";
        const byId = new Map(input.docs.map((d) => [d.title, d]));
        const created: Document[] = rows.map((r) => {
          const src = byId.get(r.title);
          return {
            id: r.id,
            title: r.title,
            type: r.type,
            status: "selesai",
            subject: src?.subject ?? "",
            jenjang: src?.jenjang ?? "",
            updatedAt: nowIso,
            updatedLabel: "Baru saja",
            ownerId: uidRef.current ?? "",
            ownerName,
            qualityMode: src?.qualityMode ?? "standar",
            // konten hasil AI (bila ada) > konten contoh dari klien
            content: r.content ?? src?.content ?? null,
          };
        });
        setState((s) => ({
          ...s,
          credits: Math.max(0, s.credits - input.cost),
          documents: [...created, ...s.documents],
        }));
        // sinkronkan saldo dgn server (replay idempoten tidak memotong ulang)
        void sb.rpc("credit_balance").then(({ data: bal }) => {
          if (typeof bal === "number")
            setState((s) => ({ ...s, credits: bal }));
        });
        addNotification({
          type: "dokumen",
          title: input.notifTitle,
          body: input.notifBody,
          timeLabel: "Baru saja",
        });
        return rows;
      }

      // mode mock
      const stamp = Date.now();
      const nowIso = new Date().toISOString();
      const mockUser = MOCK_USERS[state.role];
      const created: Document[] = input.docs.map((d, i) => ({
        id: `doc-${stamp}-${i}`,
        title: d.title,
        type: d.type,
        status: "selesai",
        subject: d.subject,
        jenjang: d.jenjang,
        updatedAt: nowIso,
        updatedLabel: "Baru saja",
        ownerId: mockUser.id,
        ownerName: mockUser.nama,
        qualityMode: d.qualityMode,
        content: d.content,
      }));
      setState((s) => ({
        ...s,
        credits: Math.max(0, s.credits - input.cost),
        documents: [...created, ...s.documents],
        notifications: [
          {
            id: `n-${stamp}`,
            type: "dokumen",
            title: input.notifTitle,
            body: input.notifBody,
            timeLabel: "Baru saja",
            read: false,
          },
          ...s.notifications,
        ],
      }));
      return created.map((d) => ({ id: d.id, title: d.title, type: d.type }));
    },
    [mode, state.role, supaUser, addNotification],
  );

  const completePayment = useCallback(
    async (input: PaymentInput) => {
      if (mode === "supabase") {
        const sb = getSupabase()!;
        const { data, error } = await sb.rpc("simulate_payment", {
          p_order_id: input.orderId,
          p_type: input.type,
          p_label: input.label,
          p_method: input.method,
          p_amount: input.amount,
          p_credits: input.credits,
        });
        if (error) throw new Error(error.message);
        setState((s) => ({
          ...s,
          credits: typeof data === "number" ? data : s.credits,
          plan: input.type === "subscription" ? "pro" : s.plan,
          transactions: [
            {
              id: input.orderId,
              type: input.type,
              label: input.label,
              method: input.method,
              amount: input.amount,
              status: "lunas",
              date: shortDate(new Date().toISOString()),
            },
            ...s.transactions,
          ],
        }));
        if (input.type === "subscription")
          setSupaUser((u) => (u ? { ...u, plan: "pro" } : u));
        return;
      }

      // mode mock
      setState((s) => ({
        ...s,
        credits: input.type === "topup" ? s.credits + input.credits : s.credits,
        plan: input.type === "subscription" ? "pro" : s.plan,
        transactions: [
          {
            id: input.orderId,
            type: input.type,
            label: input.label,
            method: input.method,
            amount: input.amount,
            status: "lunas",
            date: shortDate(new Date().toISOString()),
          },
          ...s.transactions,
        ],
      }));
    },
    [mode],
  );

  const startCheckout = useCallback(
    async (
      input: PaymentInput,
    ): Promise<
      { mode: "simulated" } | { mode: "gateway"; orderId: string; paymentUrl: string }
    > => {
      if (mode !== "supabase") return { mode: "simulated" };
      const sb = getSupabase()!;
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return { mode: "simulated" };
      try {
        const res = await fetch("/api/payments/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: input.type,
            label: input.label,
            method: input.method,
            amount: input.amount,
            credits: input.credits,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          mode?: string;
          orderId?: string;
          paymentUrl?: string;
        } | null;
        if (res.ok && json?.mode === "gateway" && json.orderId && json.paymentUrl) {
          return {
            mode: "gateway",
            orderId: json.orderId,
            paymentUrl: json.paymentUrl,
          };
        }
      } catch (e) {
        console.error("AjarKit: create payment gagal — fallback simulasi", e);
      }
      return { mode: "simulated" };
    },
    [mode],
  );

  const refreshFromServer = useCallback(async () => {
    if (mode !== "supabase" || !uidRef.current) return;
    const sb = getSupabase()!;
    const [balRes, trxRes, profRes] = await Promise.all([
      sb.rpc("credit_balance"),
      sb
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("profiles").select("plan").eq("id", uidRef.current).single(),
    ]);
    setState((s) => ({
      ...s,
      credits: typeof balRes.data === "number" ? balRes.data : s.credits,
      transactions: (trxRes.data ?? []).map(trxFromRow),
      plan: (profRes.data?.plan as Plan) ?? s.plan,
    }));
    if (profRes.data?.plan)
      setSupaUser((u) => (u ? { ...u, plan: profRes.data.plan as Plan } : u));
  }, [mode]);

  /* ----- referral (migration 0008 + revisi 0009) ----- */

  const setPendingReferral = useCallback((code: string | null) => {
    const v = code?.trim().toUpperCase() || null;
    setPendingReferralState(v);
    try {
      if (v) localStorage.setItem(REF_STORAGE_KEY, v);
      else localStorage.removeItem(REF_STORAGE_KEY);
    } catch {
      /* penyimpanan penuh/diblokir — abaikan */
    }
  }, []);

  // hidrasi kode tertunda dari localStorage (sekali, SSR-safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REF_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrasi localStorage satu kali; render pertama wajib sama dengan SSR
      if (saved) setPendingReferralState(saved.trim().toUpperCase());
    } catch {
      /* abaikan */
    }
  }, []);

  // mode Supabase: begitu signedIn & ada kode tertunda → terapkan SEKALI,
  // lalu hapus kode apa pun hasilnya (kode salah tidak dicoba terus-menerus).
  // 0009: apply hanya mencatat referred_by — TANPA bonus langsung; bonus
  // kedua pihak baru cair saat teman melakukan pembelian lunas pertama.
  useEffect(() => {
    if (mode !== "supabase" || authStatus !== "signedIn") return;
    const code = pendingReferral;
    if (!code || refAttemptedRef.current === code) return;
    refAttemptedRef.current = code;
    const sb = getSupabase()!;
    // PENTING: rpc() supabase-js lazy — wajib .then() agar request terkirim
    void sb.rpc("apply_referral_code", { p_code: code }).then(({ data, error }) => {
      setPendingReferral(null); // hapus apa pun hasilnya
      if (error) {
        // PGRST202 = migration 0008/0009 belum dijalankan — jangan berisik
        const e = error as { code?: string; message?: string };
        if (e.code !== "PGRST202") {
          console.error("AjarKit: apply_referral_code gagal", error);
        }
        return;
      }
      // saldo TIDAK berubah saat apply (0009) — refresh ringan tetap aman
      if (data === "OK") void refreshFromServer();
    });
  }, [mode, authStatus, pendingReferral, setPendingReferral, refreshFromServer]);

  const getReferralInfo = useCallback(async (): Promise<ReferralInfo | null> => {
    if (mode !== "supabase") {
      // mode mock: data dummy utk pratinjau UI
      return { code: "AJAR1234", invited: 3, converted: 1, earned: 42 };
    }
    if (!uidRef.current) return null;
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc("referral_stats");
    if (!error && data && typeof data === "object") {
      const d = data as {
        code?: string | null;
        invited?: number;
        converted?: number;
        earned?: number;
      };
      if (d.code) {
        return {
          code: d.code,
          invited: d.invited ?? 0,
          converted: d.converted ?? 0,
          earned: d.earned ?? 0,
        };
      }
    }
    // fallback (RPC error / migrasi belum jalan): coba kolom referral_code
    const { data: prof, error: profErr } = await sb
      .from("profiles")
      .select("referral_code")
      .eq("id", uidRef.current)
      .single();
    const code = (prof as { referral_code?: string | null } | null)?.referral_code;
    if (!profErr && code) return { code, invited: 0, converted: 0, earned: 0 };
    return null;
  }, [mode]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (mode !== "supabase") return null;
    const sb = getSupabase()!;
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  }, [mode]);

  const signOut = useCallback(async () => {
    if (mode === "supabase") {
      await getSupabase()!.auth.signOut();
      // state dibersihkan oleh onAuthStateChange(SIGNED_OUT)
      return;
    }
    setState(DEFAULT_STATE);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    const cur =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ajarkit-theme", next);
    } catch {
      /* abaikan */
    }
    // beri tahu komponen lain (mis. segmented Tema di Pengaturan > Akun)
    window.dispatchEvent(new Event("ajarkit-theme"));
  }, []);

  const resetMock = useCallback(() => {
    if (mode === "supabase") {
      void signOut();
      return;
    }
    setState(DEFAULT_STATE);
  }, [mode, signOut]);

  /* ============================ value ============================ */

  const value = useMemo<AppStore>(() => {
    let user: User;
    if (mode === "supabase") {
      user =
        supaUser ?? {
          id: "",
          nama: "",
          email: "",
          role: state.role,
          initials: "?",
          plan: state.plan,
        };
    } else {
      const overrides = state.profileOverrides?.[state.role] ?? {};
      const base = MOCK_USERS[state.role];
      user = {
        ...base,
        ...overrides,
        plan: state.plan,
        initials: overrides.nama ? initialsOf(overrides.nama) : base.initials,
      };
    }
    return {
      ...state,
      mode,
      authStatus,
      hydrated,
      user,
      unreadCount: state.notifications.filter((n) => !n.read).length,
      // Ruang (M3): nyata di Supabase; mock = fixture (guru) / kosong (dosen)
      workspace:
        mode === "supabase"
          ? wsInfo
          : state.role === "guru"
            ? {
                id: MOCK_WORKSPACE.id,
                nama: MOCK_WORKSPACE.nama,
                plan: MOCK_WORKSPACE.plan,
                seats: MOCK_WORKSPACE.seats,
                approvalRequired: false,
                myRole: "admin" as const,
                myStatus: "aktif" as const,
              }
            : null,
      reviews:
        mode === "supabase"
          ? wsReviews
          : mockReviews(state.documents, state.reviewOverrides),
      setRole,
      setPlan,
      setOnboardingDone,
      setPendingEmail,
      updateProfile,
      addMember,
      updateMember,
      removeMember,
      createWorkspace,
      inviteMember,
      acceptInvite,
      submitForReview,
      decideReview,
      addCredits,
      deductCredits,
      addDocument,
      updateDocument,
      removeDocument,
      duplicateDocument,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      addTransaction,
      completeGeneration,
      completePayment,
      startCheckout,
      refreshFromServer,
      setPendingReferral,
      getReferralInfo,
      getAccessToken,
      signOut,
      toggleTheme,
      resetMock,
    };
  }, [
    state,
    mode,
    authStatus,
    hydrated,
    supaUser,
    wsInfo,
    wsReviews,
    setRole,
    setPlan,
    setOnboardingDone,
    setPendingEmail,
    updateProfile,
    addMember,
    updateMember,
    removeMember,
    createWorkspace,
    inviteMember,
    acceptInvite,
    submitForReview,
    decideReview,
    addCredits,
    deductCredits,
    addDocument,
    updateDocument,
    removeDocument,
    duplicateDocument,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    addTransaction,
    completeGeneration,
    completePayment,
    startCheckout,
    refreshFromServer,
    setPendingReferral,
    getReferralInfo,
    getAccessToken,
    signOut,
    toggleTheme,
    resetMock,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp harus dipakai di dalam <AppProvider>");
  return ctx;
}
