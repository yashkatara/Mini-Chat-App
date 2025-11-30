export type Lang = "en" | "es";

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    title: "Chat Applicaiton",
    placeholder: "Type a message and press Enter...",
    send: "Send",
    tenantLabel: "Tenant",
    typing: "typing...",
    clear: "Clear",
    history: "History",
    lang: "Language"
  },
  es: {
    title: "Chat Aplicación",
    placeholder: "Escribe un mensaje y presiona Enter...",
    send: "Enviar",
    tenantLabel: "Inquilino",
    typing: "escribiendo...",
    clear: "Limpiar",
    history: "Historial",
    lang: "Idioma"
  }
};

export function t(lang: Lang, key: string) {
  return DICT[lang][key] ?? key;
}
