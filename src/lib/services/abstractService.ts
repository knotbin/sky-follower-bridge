import { MESSAGE_NAME_TO_QUERY_PARAM_MAP } from "~lib/constants";
import type { BskyUser, CrawledUserInfo, MessageName } from "~types";

export abstract class AbstractService {
  messageName: MessageName;
  crawledUsers: Set<string>;

  constructor(messageName: string) {
    this.messageName = messageName as MessageName;
    this.crawledUsers = new Set();
  }

  abstract isTargetPage(): [boolean, string];

  abstract processExtractedData(
    user: CrawledUserInfo,
  ): Promise<CrawledUserInfo>;

  abstract extractUserData(userCell: Element): CrawledUserInfo;

  getCrawledUsers(): CrawledUserInfo[] {
    const userCells = Array.from(
      document.querySelectorAll(
        MESSAGE_NAME_TO_QUERY_PARAM_MAP[this.messageName],
      ),
    );
  
    const users = Array.from(userCells)
      .map((userCell) => this.extractUserData(userCell))
      .filter((user) => {
        if (!user) return false;
        const hasUnwantedWords = ["Like", "Reply", "Repost", "Share"].some(word =>
          user.displayName.includes(word) || user.accountName.includes(word)
        );
        if (hasUnwantedWords) {
          console.log("Discarding user due to unwanted words:", user);
          return false;
        }
        return true;
      });
  
    const filteredUsers = users.filter((user) => {
      const isNewUser = !this.crawledUsers.has(user.accountName);
      if (isNewUser) {
        this.crawledUsers.add(user.accountName);
      }
      return isNewUser;
    });
  
    return filteredUsers;
  }

  abstract performScrollAndCheckEnd(): Promise<boolean>;
}
