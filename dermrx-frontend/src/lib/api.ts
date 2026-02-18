export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  searchDrugs: async (query: string) => {
    const res = await fetch(
      `${API_BASE_URL}/api/drugs/search?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) throw new Error("Drug search failed");
    return res.json();
  },

  analyze: async (image: File, medications: string[]) => {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("patient_medications", medications.join(","));
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Analysis failed");
    return res.json();
  },

  drugCheck: async (drugNames: string[], patientMedications: string[]) => {
    const res = await fetch(`${API_BASE_URL}/api/drug-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drug_names: drugNames,
        patient_medications: patientMedications,
      }),
    });
    if (!res.ok) throw new Error("Drug check failed");
    return res.json();
  },
};
