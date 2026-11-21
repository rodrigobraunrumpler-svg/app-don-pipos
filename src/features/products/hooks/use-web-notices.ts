import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Share } from "react-native";

import { appEnv } from "@/lib/env";
import { errorMessage } from "@/lib/errors";

import { saveProductMutation } from "../queries/mutations";
import { pageUrl, shareText } from "../rules/web";
import type { Product } from "../schema/product";
import { useProductDraft } from "./product-draft";

type Toast = { message: string; action?: { label: string; run: () => void }; hide: () => void };
const FOLLOW_MS = 60_000;

// Los avisos de Productos y precios al volver de un alfajor: «se publicó en la web» con «Deshacer» (lo esconde) y,
// cuando la copia termina, «ya está en la web» con «Compartir» (sin la dirección de la web configurada, no sale)
export function useWebNotices(products: Product[] | undefined): Toast | null {
  const { notice, setNotice, published, setPublished } = useProductDraft();
  const save = useMutation(saveProductMutation);
  const [result, setResult] = useState<string | null>(null);

  async function undo(product: Product) {
    const latest = products?.find((item) => item.id === product.id) ?? product;
    setNotice(null);
    setPublished(null);
    try {
      await save.mutateAsync({ ...latest, expectedVersion: latest.version, showOnWeb: false });
      setResult(`${latest.name} ya no se ve en la web.`);
    } catch (error) {
      setResult(errorMessage(error));
    }
  }

  const live = published ? products?.find((item) => item.id === published.id && item.webState === "sent") : undefined;
  let toast: Toast | null = null;
  if (result) toast = { message: result, hide: () => setResult(null) };
  else if (live) {
    const url = pageUrl(appEnv.ok ? appEnv.env.webUrl : undefined, live.webSlug);
    toast = {
      message: `${live.name} ya está en la web.`,
      action: url
        ? { label: "Compartir", run: () => void Share.share({ message: shareText(live.name, url) }) }
        : undefined,
      hide: () => setPublished(null),
    };
  } else if (notice?.kind === "published") {
    const { product } = notice;
    toast = {
      message: `${product.name} se publicó en la web.`,
      action: { label: "Deshacer", run: () => void undo(product) },
      hide: () => setNotice(null),
    };
  } else if (notice) toast = { message: `${notice.product.name} guardado.`, hide: () => setNotice(null) };

  return toast;
}

// Mientras un alfajor recién publicado se sube a la web, la lista se vuelve a pedir cada 3 segundos (hasta 1 minuto)
export function useFollowPublished(): (query: { state: { data?: Product[] } }) => number | false {
  const { published } = useProductDraft();
  return (query) =>
    published &&
    Date.now() - published.at < FOLLOW_MS &&
    query.state.data?.some((item) => item.id === published.id && item.webState !== "sent")
      ? 3000
      : false;
}
