import { findFirstScrollableElements, wait } from "~lib/utils";
import type { CrawledUserInfo } from "~types";
import { AbstractService } from "./abstractService";

export class ThreadsService extends AbstractService {
  async processExtractedData(user: CrawledUserInfo): Promise<CrawledUserInfo> {
    const avatarUrl = user.originalAvatar;
    if (avatarUrl) {
      try {
        const response = await fetch(avatarUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Url = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        user.originalAvatar = base64Url;
      } catch (error) {
        console.error("Failed to convert avatar to base64:", error);
      }
    }
    return user;
  }

  isTargetPage(): [boolean, string] {
    const isTargetPage = document.querySelector(
      '[role="dialog"] [role="tab"]>[role="button"]',
    );
    if (!isTargetPage) {
      return [
        false,
        "Invalid page. please open the following or followers view.",
      ];
    }
    return [true, ""];
  }

  extractUserData(userCell: Element): CrawledUserInfo {
    const textContent = (userCell as HTMLElement).textContent;

    const parts = textContent?.split(/(?=[A-Z])/).map((part) => part.trim()) ?? [];
    console.log("Split parts:", parts);

    // Remove unwanted words and parts containing digits (follower counts) or 'K' (thousands of followers)
    const filteredParts = parts.filter(part => 
        !part.match(/\d/) && 
        !part.includes("K") &&
        part !== "Verified" && 
        part !== "Following" && 
        part !== "Follow" && 
        part !== "followers"
    );
    console.log("Filtered parts:", filteredParts);

    const _accountName = filteredParts.length > 0 ? filteredParts[0] : "";
    const displayName = filteredParts.length > 1 ? filteredParts.slice(1).join(" ") : "";
    console.log("Extracted account name and display name:", _accountName, displayName);

    const accountName = _accountName.replaceAll(".", "");
    const accountNameRemoveUnderscore = accountName.replaceAll("_", ""); // bsky does not allow underscores in handle, so remove them.
    const accountNameReplaceUnderscore = accountName.replaceAll("_", "-");
    console.log("Processed account names:", accountName, accountNameRemoveUnderscore, accountNameReplaceUnderscore);

    const avatarElement = userCell.querySelector("img");
    const avatarSrc = avatarElement?.getAttribute("src") ?? "";
    console.log("Extracted avatar src:", avatarSrc);

    return {
      accountName,
      displayName,
      accountNameRemoveUnderscore,
      accountNameReplaceUnderscore,
      bskyHandle: "",
      originalAvatar: avatarSrc,
      originalProfileLink: `https://www.threads.net/@${_accountName}`,
    };
  }

  async performScrollAndCheckEnd(): Promise<boolean> {
    const scrollTarget = findFirstScrollableElements(
      document.querySelector('[role="dialog"]') as HTMLElement,
    );

    if (!scrollTarget) {
      return true;
    }

    const initialScrollHeight = scrollTarget.scrollHeight;
    scrollTarget.scrollTop += initialScrollHeight;

    await wait(3000);

    const hasReachedEnd =
      scrollTarget.scrollTop + scrollTarget.clientHeight >=
      scrollTarget.scrollHeight;

    return hasReachedEnd;
  }
}
