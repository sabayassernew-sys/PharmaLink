/**
 * Avatar compression and preset icons for PharmaLink user profiles.
 */

export function compressAvatar(file: File, maxDim = 180, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("الملف المحدد ليس صورة صالحة"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة ملف الصورة"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذر معالجة أبعاد الصورة"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scale to fit within maxDim x maxDim
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Produces a compact JPEG (< 20KB)
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function makeSvgAvatar(bg: string, iconColor: string, symbolSvg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="28" fill="${bg}"/>
    <g fill="${iconColor}" transform="translate(20, 20) scale(0.6)">
      ${symbolSvg}
    </g>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export interface PresetAvatar {
  id: string;
  label: string;
  category: "pharmacy" | "pharmacist" | "chain";
  dataUrl: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: "pharmacy-teal",
    label: "صيدلية فارما لينك",
    category: "pharmacy",
    dataUrl: makeSvgAvatar(
      "#00ADB5",
      "#FFFFFF",
      `<path d="M40 10 H60 V40 H90 V60 H60 V90 H40 V60 H10 V40 H40 Z" />`,
    ),
  },
  {
    id: "pharmacy-navy",
    label: "صيدلية رسمية",
    category: "pharmacy",
    dataUrl: makeSvgAvatar(
      "#073B59",
      "#00ADB5",
      `<path d="M50 5 L95 30 V45 H5 V30 Z M15 50 H30 V85 H15 Z M42 50 H58 V85 H42 Z M70 50 H85 V85 H70 Z M5 90 H95 V100 H5 Z" />`,
    ),
  },
  {
    id: "pharmacy-emerald",
    label: "صيدلية خضراء",
    category: "pharmacy",
    dataUrl: makeSvgAvatar(
      "#059669",
      "#FFFFFF",
      `<path d="M40 10 H60 V40 H90 V60 H60 V90 H40 V60 H10 V40 H40 Z" />`,
    ),
  },
  {
    id: "capsule",
    label: "كبسولة دوائية",
    category: "pharmacy",
    dataUrl: makeSvgAvatar(
      "#0F766E",
      "#CCFBF1",
      `<rect x="15" y="30" width="70" height="40" rx="20" transform="rotate(-35 50 50)" />`,
    ),
  },
  {
    id: "pharmacist-m",
    label: "صيدلي مسؤول",
    category: "pharmacist",
    dataUrl: makeSvgAvatar(
      "#1E293B",
      "#38BDF8",
      `<circle cx="50" cy="30" r="20" /><path d="M15 90 C15 65 30 55 50 55 C70 55 85 65 85 90 Z" />`,
    ),
  },
  {
    id: "pharmacist-f",
    label: "صيدلانية مسؤولة",
    category: "pharmacist",
    dataUrl: makeSvgAvatar(
      "#0E7490",
      "#67E8F9",
      `<circle cx="50" cy="30" r="20" /><path d="M20 90 C20 68 32 58 50 58 C68 58 80 68 80 90 Z" />`,
    ),
  },
  {
    id: "chain-hq",
    label: "إدارة مجموعة وسلسلة",
    category: "chain",
    dataUrl: makeSvgAvatar(
      "#1E1B4B",
      "#818CF8",
      `<rect x="10" y="30" width="35" height="60" rx="5" /><rect x="55" y="10" width="35" height="80" rx="5" />`,
    ),
  },
];
