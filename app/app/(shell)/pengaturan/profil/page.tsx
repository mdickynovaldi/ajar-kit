"use client";

/* AjarKit — Pengaturan / Profil (design.md §9.J, prd.md §8.8).
   Porting pane "Profil" dari Ajarkit/app-pengaturan.html.
   Peran (Guru/Dosen) tersambung ke store.setRole → mode seluruh aplikasi
   ikut berganti. Form di-remount via key saat peran/hidrasi berubah agar
   nilai default mengikuti persona mock aktif (aman hidrasi: render pertama
   selalu memakai persona default = sama dengan SSR). */

import { useState } from "react";
import { Avatar, Button, Field, Segmented } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import type { Role, User } from "@/lib/types";
import { SettingsShell } from "../_components/settings-nav";

const BIO_DEFAULT: Record<Role, string> = {
  guru: "Guru kelas 5 dengan minat pada pembelajaran berbasis proyek.",
  dosen: "Dosen Teknik Informatika dengan minat pada algoritma dan basis data.",
};

export default function PengaturanProfilPage() {
  const app = useApp();
  return (
    <SettingsShell>
      <ProfilForm key={`${app.role}-${app.hydrated ? "h" : "s"}`} />
    </SettingsShell>
  );
}

function ProfilForm() {
  const app = useApp();
  const toast = useToast();

  const [nama, setNama] = useState(app.user.nama);
  const [jenjang, setJenjang] = useState(app.user.jenjang ?? "SD");
  // dipisah koma agar seluruh isi array ikut tampil & tersimpan utuh
  const [mapel, setMapel] = useState(app.user.mapel?.join(", ") ?? "");
  const [pt, setPt] = useState(app.user.pt ?? "");
  const [prodi, setProdi] = useState(app.user.prodi ?? "");
  const [mk, setMk] = useState(app.user.mataKuliah?.join(", ") ?? "");
  const [sekolah, setSekolah] = useState(app.user.sekolah ?? app.user.pt ?? "");
  const [bio, setBio] = useState(BIO_DEFAULT[app.role]);
  /* ----- profil instansi: kop & tanda tangan PDF (migration 0005) ----- */
  const [instInduk, setInstInduk] = useState(app.user.instansiInduk ?? "");
  const [instNama, setInstNama] = useState(app.user.namaInstansi ?? "");
  const [instAlamat, setInstAlamat] = useState(app.user.alamatInstansi ?? "");
  const [instKontak, setInstKontak] = useState(app.user.kontakInstansi ?? "");
  const [instLogo, setInstLogo] = useState(app.user.logoInstansi ?? "");
  const [kota, setKota] = useState(app.user.kota ?? "");
  const [nip, setNip] = useState(app.user.nip ?? "");
  const [pimJabatan, setPimJabatan] = useState(
    app.user.pimpinanJabatan ??
      (app.role === "dosen" ? "Ketua Program Studi" : "Kepala Sekolah"),
  );
  const [pimNama, setPimNama] = useState(app.user.pimpinanNama ?? "");
  const [pimNip, setPimNip] = useState(app.user.pimpinanNip ?? "");

  /* logo → data-URL base64 (maks 400KB agar muat di kolom & payload PDF) */
  function pilihLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/.test(f.type)) {
      toast("Format logo harus PNG/JPG", false);
      return;
    }
    if (f.size > 400_000) {
      toast("Logo terlalu besar (maks 400KB)", false);
      return;
    }
    const r = new FileReader();
    r.onload = () => setInstLogo(String(r.result));
    r.readAsDataURL(f);
  }

  function gantiPeran(r: Role) {
    if (r === app.role) return;
    app.setRole(r);
    toast(`Mode diganti ke ${r === "dosen" ? "Dosen" : "Guru"}`);
  }

  /** "Algoritma, Basis Data" → ["Algoritma", "Basis Data"] */
  function keDaftar(v: string): string[] {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function simpanProfil() {
    const patch: Partial<User> = { nama: nama.trim() || app.user.nama };
    if (app.role === "guru") {
      patch.jenjang = jenjang;
      patch.mapel = keDaftar(mapel);
      patch.sekolah = sekolah;
    } else {
      patch.pt = pt;
      patch.prodi = prodi;
      patch.mataKuliah = keDaftar(mk);
      patch.sekolah = sekolah;
    }
    // profil instansi (kop & ttd dokumen)
    patch.instansiInduk = instInduk.trim();
    patch.namaInstansi = instNama.trim();
    patch.alamatInstansi = instAlamat.trim();
    patch.kontakInstansi = instKontak.trim();
    patch.logoInstansi = instLogo;
    patch.kota = kota.trim();
    patch.nip = nip.trim();
    patch.pimpinanJabatan = pimJabatan.trim();
    patch.pimpinanNama = pimNama.trim();
    patch.pimpinanNip = pimNip.trim();
    // updateProfile: mode mock → profileOverrides (localStorage);
    // mode Supabase → patch kolom profiles (fire-and-forget di store).
    app.updateProfile(patch);
    toast("Profil disimpan");
  }

  return (
    <section
      className="card pad-lg stack"
      style={{ "--gap": "18px" } as React.CSSProperties}
    >
      <h3 className="t-h3">Profil</h3>

      <div className="row" style={{ gap: 14 }}>
        <Avatar initials={app.user.initials} size="lg" />
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast("Fitur ubah foto segera hadir")}
          >
            Ubah foto
          </Button>
          <p className="t-small faint" style={{ marginTop: 6 }}>
            JPG/PNG, maks 2MB
          </p>
        </div>
      </div>

      <div className="form-2">
        <Field label="Nama lengkap">
          <input
            className="input"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={app.user.email}
            readOnly
            aria-readonly="true"
          />
        </Field>
      </div>

      <Field label="Peran" help="Mengubah peran mengganti mode seluruh aplikasi.">
        <Segmented<Role>
          options={[
            { value: "guru", label: "Guru" },
            { value: "dosen", label: "Dosen" },
          ]}
          value={app.role}
          onChange={gantiPeran}
        />
      </Field>

      {app.role === "guru" ? (
        <div className="form-2">
          <Field label="Jenjang">
            <select
              className="select"
              value={jenjang}
              onChange={(e) => setJenjang(e.target.value)}
            >
              <option>SD</option>
              <option>SMP</option>
              <option>SMA</option>
            </select>
          </Field>
          <Field label="Mata pelajaran utama">
            <input
              className="input"
              value={mapel}
              onChange={(e) => setMapel(e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <>
          <div className="form-2">
            <Field label="Perguruan tinggi">
              <input
                className="input"
                value={pt}
                onChange={(e) => setPt(e.target.value)}
              />
            </Field>
            <Field label="Program studi">
              <input
                className="input"
                value={prodi}
                onChange={(e) => setProdi(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Mata kuliah">
            <input
              className="input"
              value={mk}
              onChange={(e) => setMk(e.target.value)}
              placeholder="Mis. Algoritma & Pemrograman, Basis Data"
            />
          </Field>
        </>
      )}

      <Field label="Sekolah / kampus">
        <input
          className="input"
          value={sekolah}
          onChange={(e) => setSekolah(e.target.value)}
        />
      </Field>

      <Field label="Bio singkat">
        <textarea
          className="textarea"
          placeholder="Mis. Guru kelas 5, suka pembelajaran berbasis proyek."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </Field>

      <div>
        <Button onClick={simpanProfil}>Simpan</Button>
      </div>

      <div className="nav-sep" style={{ margin: "4px 0" }} />
      <div>
        <h3 className="t-h3">Profil Instansi</h3>
        <p className="muted t-small" style={{ marginTop: 2 }}>
          Dipakai untuk kop surat &amp; blok tanda tangan saat mengunduh PDF
          (ATP/Modul Ajar/RPS). Kosongkan bila ingin header AjarKit.
        </p>
      </div>

      <div className="row" style={{ gap: 14, alignItems: "center" }}>
        {instLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau data-URL
          <img
            src={instLogo}
            alt="Logo instansi"
            style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }}
          />
        ) : (
          <span className="doc-ic ic-blue" style={{ width: 56, height: 56 }}>
            <Icon name="school" />
          </span>
        )}
        <div className="row" style={{ gap: 8 }}>
          <label className="btn btn-secondary sm" style={{ cursor: "pointer" }}>
            Unggah logo
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={pilihLogo}
              style={{ display: "none" }}
            />
          </label>
          {instLogo && (
            <Button variant="ghost" size="sm" onClick={() => setInstLogo("")}>
              Hapus
            </Button>
          )}
        </div>
      </div>

      <Field
        label="Instansi induk (baris atas kop — opsional)"
        help='Mis. "PEMERINTAH PROVINSI JAWA TIMUR" lalu baris baru "DINAS PENDIDIKAN". Satu baris per institusi.'
      >
        <textarea
          className="textarea"
          style={{ minHeight: 64 }}
          value={instInduk}
          onChange={(e) => setInstInduk(e.target.value)}
          placeholder={"PEMERINTAH PROVINSI …\nDINAS PENDIDIKAN"}
        />
      </Field>
      <div className="form-2">
        <Field label="Nama instansi">
          <input
            className="input"
            value={instNama}
            onChange={(e) => setInstNama(e.target.value)}
            placeholder={app.role === "dosen" ? "Universitas …" : "SMA Negeri …"}
          />
        </Field>
        <Field label="Kota (utk tanda tangan)">
          <input
            className="input"
            value={kota}
            onChange={(e) => setKota(e.target.value)}
            placeholder="Malang"
          />
        </Field>
      </div>
      <Field label="Alamat instansi">
        <input
          className="input"
          value={instAlamat}
          onChange={(e) => setInstAlamat(e.target.value)}
          placeholder="Jl. … No. …, Kec. …, Kota/Kab. …, Provinsi, Kode Pos"
        />
      </Field>
      <Field label="Kontak (opsional)">
        <input
          className="input"
          value={instKontak}
          onChange={(e) => setInstKontak(e.target.value)}
          placeholder="Website: … · Email: …"
        />
      </Field>
      <div className="form-2">
        <Field label={app.role === "dosen" ? "NIDN kamu" : "NIP kamu"}>
          <input
            className="input"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            placeholder="19xxxxxxxxxxxxxxxx"
          />
        </Field>
        <Field label="Jabatan pimpinan">
          <input
            className="input"
            value={pimJabatan}
            onChange={(e) => setPimJabatan(e.target.value)}
          />
        </Field>
      </div>
      <div className="form-2">
        <Field label="Nama pimpinan (Mengetahui)">
          <input
            className="input"
            value={pimNama}
            onChange={(e) => setPimNama(e.target.value)}
            placeholder="Nama kepala sekolah / kaprodi"
          />
        </Field>
        <Field label="NIP pimpinan">
          <input
            className="input"
            value={pimNip}
            onChange={(e) => setPimNip(e.target.value)}
          />
        </Field>
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button onClick={simpanProfil}>Simpan</Button>
      </div>
    </section>
  );
}
