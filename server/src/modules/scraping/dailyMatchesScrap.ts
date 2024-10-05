// @ts-nocheck

import { pubsub } from "../..";
import Match from "../../models/Match";
import { convertTime } from "../../utils/convertTime";
import { getTimeUntilMidnight } from "../../utils/getTimeUntilMidnight";
import { sleep } from "../../utils/sleep";

async function dailyMatchesScrap({ page, date }) {
  while (true) {
    const matches = await task({ page, date });

    const livematches = matches.filter(({ status }) => status == "live");
    const nextmatches = matches.filter(({ status }) => status == "next");

    if (livematches.length > 0) {
      await sleep(2.5 * 60 * 1000);
    } else if (nextmatches.length > 0) {
      const nextMatch = nextmatches[0].result;

      const [nextMatchHour, nextMatchMinute] = nextmatches[0].result
        .split(":")
        .map(Number);
      const nextMatchTime = new Date().setHours(
        nextMatchHour,
        nextMatchMinute,
        0,
        0
      );
      const sleepTime = Math.max((nextMatchTime - Date.now()) / (1000 * 60), 0);

      await sleep(sleepTime * 60 * 1000);
    } else {
      const time = getTimeUntilMidnight();

      if (time > 0) {
        await sleep(time);
      } else {
        return;
      }
    }
  }
}

async function task({ page, date }) {
  await page.goto(
    `https://www.transfermarkt.com.ar/ticker/index/live?datum=${date}`,
    { waitUntil: "networkidle0", timeout: 0 }
  );

  const matches = await page.evaluate(() => {
    let data = [];
    let leagueAndPosition = [];

    const allLeaguesDict = {
      EL: "EL",
      CL: "CL",
      CLI: "CLI",
      CS: "CS",
      ES1: "ES1",
      NL1: "NL1",
      GB1: "GB1",
      FR1: "FR1",
      IT1: "IT1",
      L1: "L1",
      ARCA: "ARCA",
      AR1N: "AR1N",
    };

    document
      .querySelectorAll("#spieltagsbox div[class='kategorie']")
      .forEach((item, i) => {
        const title = item.querySelector("h2 a").textContent;
        const league_code = item.querySelector("h2 a").href.split("/").pop();
        exist = allLeaguesDict[league_code];

        if (exist) {
          leagueAndPosition.push({ pos: i, title: title });
        }
      });

    tables = document.querySelectorAll("table.livescore");

    leagueAndPosition.forEach((item, i) => {
      const table = tables[item.pos];

      const rows = table.querySelectorAll("tbody tr").forEach((row) => {
        let status;
        const eventId = row.getAttribute("id");
        const homeTeam = row
          .querySelector("td:nth-child(3) a")
          .textContent.trim();
        const homeTeamImg =
          row.querySelector("td:nth-child(3) a img").getAttribute("data-src") ||
          "";
        const awayTeam = row
          .querySelector("td:nth-child(5) a")
          .textContent.trim();
        const awayTeamImg =
          row.querySelector("td:nth-child(5) a img").getAttribute("data-src") ||
          "";
        const result = row.querySelector("td:nth-child(4) a span");
        const info = row.querySelector("td").textContent.trim() || "";

        if (result.classList.contains("liveresult")) {
          status = "live";
        } else if (result.classList.contains("finished")) {
          status = "finished";
        } else {
          status = "next";
        }

        data.push({
          result: result.textContent,
          league: item.title,
          eventId,
          status,
          homeTeam,
          homeTeamImg,
          awayTeam,
          awayTeamImg,
          info,
        });
      });
    });

    return data.sort((a, b) => {
      const timeA = new Date(`1970-01-01T${a.result}:00`).getTime();
      const timeB = new Date(`1970-01-01T${b.result}:00`).getTime();
      return timeA - timeB;
    });
  });

  const updateMatchStatistics = async () => {
    return await page.evaluate(() => {
      let data = [];
      const shadowRoot = document.querySelector("tm-ticker").shadowRoot;
      const tab = shadowRoot.querySelector("app-tabs div div:nth-child(4)");
      tab.click();

      shadowRoot
        .querySelectorAll("app-statistics div.stats-entry")
        .forEach((item, i) => {
          let homeTeam, awayTeam;
          const text = item.querySelector("div").textContent;

          if (text === "Posesión %") {
            const element1 = item
              .querySelector(
                ".pie-values .pie-value:nth-child(1) .pie-detail-value"
              )
              .textContent.replace("%", "");
            const element2 = item
              .querySelector(
                ".pie-values .pie-value:nth-child(2) .pie-detail-value"
              )
              .textContent.replace("%", "");
            homeTeam = {
              quantity: element1,
              percentage: element1,
            };
            awayTeam = {
              quantity: element2,
              percentage: element2,
            };

            data.unshift({ text, homeTeam, awayTeam });
          } else {
            homeTeam = {
              quantity:
                item
                  .querySelector(
                    "div.stat-chart div:nth-child(1) span:nth-child(2)"
                  )
                  ?.textContent?.trim() || "",
              percentage:
                item
                  .querySelector(
                    "div.stat-chart div:nth-child(1) span:nth-child(1)"
                  )
                  ?.style?.width?.replace("%", "") || "",
            };
            awayTeam = {
              quantity:
                item
                  .querySelector(
                    "div.stat-chart div:nth-child(3) span:nth-child(2)"
                  )
                  ?.textContent?.trim() || "",
              percentage:
                item
                  .querySelector(
                    "div.stat-chart div:nth-child(3) span:nth-child(1)"
                  )
                  ?.style?.width?.replace("%", "") || "",
            };

            data.push({ text, homeTeam, awayTeam });
          }
        });

      return data;
    });
  };

  const updateMatchLineup = async () => {
    return await page.evaluate(async () => {
      let data = [];
      const shadowRoot = document.querySelector("tm-ticker").shadowRoot;
      const tab = shadowRoot.querySelector("app-tabs div div:nth-child(3)");
      tab.click();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      shadowRoot
        .querySelectorAll("app-formation div.formation-container")
        .forEach((item, i) => {
          const titular = [];
          const substitutes = [];

          const lineup = item
            .querySelector("div div div:nth-child(2) div")
            .textContent.trim()
            .split(" ")
            .pop();

          item
            .querySelectorAll(
              "div[class='formation-and-subs'] div.formation-content > div"
            )
            .forEach((item) => {
              if (item.classList.contains("formation-field")) return;

              const name = item
                .querySelector(".formation-player-name")
                .textContent.trim();
              const number = item.querySelector("div div").textContent;
              const pos = item.classList
                .toString()
                .split(" ")
                .pop()
                .split("-")
                .pop();

              titular.push({ name, number, pos });
            });

          item
            .querySelectorAll(
              "div.formation-and-subs > div.substitutes-content > div"
            )
            .forEach((item) => {
              const name = item
                .querySelector("div.substitute-info div.player-name a")
                .textContent.trim()
                .split(" ")
                .slice(1)
                .join(" ");
              const image = item.querySelector("div a img").src;
              const number = item
                .querySelector("div:nth-child(2) div a span")
                .textContent.trim();
              const pos = null;

              substitutes.push({ name, image, number, pos });
            });

          if (i == 0) {
            data.push({ homeTeam: { lineup, titular, substitutes } });
          } else {
            data.push({
              awayTeam: { lineup, titular, substitutes },
            });
          }
        });

      return { ...data[0], ...data[1] };
    });
  };

  for (const match of matches) {
    const res = await Match.findOne({ eventId: match.eventId });
    if (!res) {
      const newMatch = new Match(match);
      newMatch.save();
      continue;
    }
    if (res.status != "live") continue;

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await page.goto(
          `https://www.transfermarkt.com.ar/ticker/begegnung/live/${res.eventId}`,
          { waitUntil: "networkidle2", timeout: 10000 }
        );
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          continue;
        }
      }
    }

    const checkExistLineup = Object.keys(res.lineup).length > 0;
    const statistics = await updateMatchStatistics();

    if (!checkExistLineup) {
      const lineup = await updateMatchLineup();
      await Match.updateOne(
        { eventId: match.eventId },
        { ...match, statistics, lineup }
      );
    } else {
      await Match.updateOne(
        { eventId: match.eventId },
        { ...match, statistics }
      );
    }
  }

  pubsub.publish("GET_MATCHES", { getMatches: await Match.find({}) });
  return matches;
}
export default dailyMatchesScrap;