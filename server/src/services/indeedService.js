import axios from "axios";
import * as cheerio from "cheerio";

function cleanText(text) {
  return text?.replace(/\s+/g, " ").trim() || "";
}

export async function importIndeedJob({ url, pastedText }) {
  if (pastedText && pastedText.trim()) {
    return {
      title: "",
      company: "",
      location: "",
      description: pastedText.trim(),
      source: "manual"
    };
  }

  if (!url || !url.trim()) {
    throw new Error("Provide a job link or paste the job description.");
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-CA,en;q=0.9",
        Referer: "https://www.google.com/"
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title =
      cleanText($("h1").first().text()) ||
      cleanText($("title").text());

    const company =
      cleanText($('[data-company-name="true"]').first().text()) ||
      cleanText($(".jobsearch-InlineCompanyRating div").first().text());

    const location =
      cleanText($(".jobsearch-JobInfoHeader-subtitle div").last().text());

    const description =
      cleanText($("#jobDescriptionText").text()) ||
      cleanText($("body").text());

    if (!description || description.length < 100) {
      throw new Error("Could not extract enough job description text from the page.");
    }

    return {
      title,
      company,
      location,
      description,
      source: "url"
    };
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error(
        "This site blocked automated extraction. Please paste the full job description manually."
      );
    }

    throw new Error(
      error.message || "Failed to import the job posting from the link."
    );
  }
}