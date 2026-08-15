import {
  asNumber,
  categoryFromQuery,
  fetchJson,
  filterSafeGalleryItems,
  firstText,
  list,
  providerNotConfigured,
  usableLicense,
} from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type FlickrResponse = {
  photos?: {
    photo?: Array<Record<string, unknown>>;
  };
};

const FLICKR_LICENSES: Record<string, string> = {
  "0": "All Rights Reserved",
  "1": "CC BY-NC-SA",
  "2": "CC BY-NC",
  "3": "CC BY-NC-ND",
  "4": "CC BY",
  "5": "CC BY-SA",
  "6": "CC BY-ND",
  "7": "No known copyright restrictions",
  "8": "United States Government Work",
  "9": "Public Domain Mark",
  "10": "CC0",
  "11": "Public Domain Dedication",
};

const flickr: GalleryProvider = {
  id: "flickr",
  label: "Flickr",
  async search(context): Promise<GalleryItem[]> {
    const apiKey = process.env.FLICKR_API_KEY;
    if (!apiKey) providerNotConfigured("Flickr", "FLICKR_API_KEY");

    const url = new URL("https://www.flickr.com/services/rest/");
    url.searchParams.set("method", "flickr.photos.search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("text", context.query);
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("per_page", String(Math.min(context.limit, 100)));
    url.searchParams.set("safe_search", context.safeSearch ? "1" : "3");
    url.searchParams.set("content_type", "1");
    url.searchParams.set("media", "photos");
    url.searchParams.set("extras", "description,owner_name,date_taken,tags,url_c,url_l,url_o");
    url.searchParams.set("format", "json");
    url.searchParams.set("nojsoncallback", "1");

    const data = await fetchJson<FlickrResponse>(url.toString());
    return filterSafeGalleryItems((data.photos?.photo ?? []).flatMap((item) => {
      const imageUrl = firstText(item.url_o, item.url_l, item.url_c);
      const thumbnailUrl = firstText(item.url_c, item.url_l, imageUrl);
      if (!imageUrl || !thumbnailUrl) return [];

      const license = FLICKR_LICENSES[String(item.license ?? "")] ?? "Unknown / Verify source";
      const rights = usableLicense(license, null);
      const owner = firstText(item.ownername, item.owner);
      return [{
        id: `flickr:${String(item.id ?? imageUrl)}`,
        title: firstText(item.title) ?? "Untitled Flickr image",
        description: firstText(item.description),
        imageUrl,
        thumbnailUrl,
        source: "Flickr",
        sourceUrl: `https://www.flickr.com/photos/${String(item.owner ?? "")}/${String(item.id ?? "")}`,
        creator: owner,
        date: firstText(item.datetaken, item.dateupload),
        category: categoryFromQuery(context.query, "photography"),
        tags: list(item.tags),
        license: rights.license,
        licenseUrl: null,
        licenseClass: rights.licenseClass,
        attribution: owner,
        width: asNumber(item.width_o ?? item.width_l ?? item.width_c),
        height: asNumber(item.height_o ?? item.height_l ?? item.height_c),
      }];
    }), context.safeSearch);
  },
};

export default flickr;