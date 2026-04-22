export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#151515]">
      <h1 className="text-3xl font-semibold">Privacy Policy GDPR/KVKK</h1>
      <p className="mt-4 text-sm leading-6 text-[#555555]">
        AdaptifAI stores only the minimum operational data needed for credits and payment reconciliation. Creative files are processed in temporary storage and are not used to train models.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Data Retention</h2>
      <p className="mt-3 text-sm leading-6 text-[#555555]">
        Uploaded and generated creative files are eligible for automatic deletion after 24 hours. Credit ledger entries are retained to support billing, refunds and account continuity.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Data Rights</h2>
      <p className="mt-3 text-sm leading-6 text-[#555555]">
        Users may request access, correction or deletion of account-related data by contacting support, subject to legal and payment-record retention requirements.
      </p>
    </main>
  );
}
