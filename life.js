(function () {
  var sliders = {
    gas: document.getElementById("gas-year"),
    spend: document.getElementById("spend-year"),
    care: document.getElementById("care-year"),
    trip: document.getElementById("trip-year"),
    date: document.getElementById("date-year"),
    gpa: document.getElementById("gpa-year"),
    pet: document.getElementById("pet-year"),
    job: document.getElementById("job-year"),
    aid: document.getElementById("aid-year"),
    home: document.getElementById("home-year")
  };
  if (!sliders.gas) return;

  var gasAnnual = {
    1992: 1.087, 1993: 1.067, 1994: 1.075, 1995: 1.111, 1996: 1.199, 1997: 1.199,
    1998: 1.030, 1999: 1.136, 2000: 1.484, 2001: 1.420, 2002: 1.345, 2003: 1.561,
    2004: 1.852, 2005: 2.270, 2006: 2.572, 2007: 2.796, 2008: 3.246, 2009: 2.353,
    2010: 2.782, 2011: 3.521, 2012: 3.618, 2013: 3.505, 2014: 3.358, 2015: 2.429,
    2016: 2.143, 2017: 2.415, 2018: 2.719, 2019: 2.604, 2020: 2.168, 2021: 3.008,
    2022: 3.951, 2023: 3.519, 2024: 3.304, 2025: 3.097
  };
  var spend = {
    1990: 28381, 1991: 29614, 1992: 29846, 1993: 30692, 1994: 31731, 1995: 32264,
    1996: 33797, 1997: 34819, 1998: 35535, 1999: 36995, 2000: 38045, 2001: 39518,
    2002: 40677, 2003: 40817, 2004: 43395, 2005: 46409, 2006: 48398, 2007: 49638,
    2008: 50486, 2009: 49067, 2010: 48109, 2011: 49705, 2012: 51442, 2013: 51100,
    2014: 53495, 2015: 55978, 2016: 57311, 2017: 60060, 2018: 61224, 2019: 63036,
    2020: 61332, 2021: 66928, 2022: 72973, 2023: 77280, 2024: 78527, 2025: 81905
  };
  var spendParts = [
    { cls: "seg-house", flex: 339, label: "Housing, $27,790" },
    { cls: "seg-else", flex: 242, label: "Remainder, $19,815" },
    { cls: "seg-move", flex: 165, label: "Transportation, $13,492" },
    { cls: "seg-food", flex: 130, label: "Food, $10,633" },
    { cls: "seg-ins", flex: 124, label: "Insurance and pensions, $10,175" }
  ];
  var trips = {
    2023: { n: 3293, href: "https://www.nerdwallet.com/travel/studies/summer-travel-report", name: "NerdWallet 2023 summer travel survey" },
    2024: { n: 3594, href: "https://www.nasdaq.com/articles/where-americans-are-traveling-in-2024:-by-the-numbers", name: "NerdWallet 2024 summer travel survey" },
    2025: { n: 3861, href: "https://www.nerdwallet.com/travel/learn/chase-sapphire-preferred-spring", name: "NerdWallet 2025 summer travel survey" },
    2026: { n: 3940, href: "https://www.nerdwallet.com/travel/studies/summer-travel-report", name: "NerdWallet 2026 Summer Travel Report" }
  };
  var dates = {
    2019: { n: 77, exact: 77, href: "https://www.lendingtree.com/personal/dating-survey/", name: "LendingTree dating survey" },
    2022: { n: 91, exact: 91, href: "https://www.mlive.com/public-interest/2022/10/first-dates-cost-91-on-average-rising-prices-have-people-going-out-less.html", name: "LendingTree survey, October 2022" },
    2026: { n: 93, exact: 92.91, band: true, href: "https://www.jgwentworth.com/resources/cost-of-dating-2026", name: "J.G. Wentworth, cost of dating 2026" }
  };
  var careReport = "https://info.childcareaware.org/hubfs/FINAL-Demanding%20Change%20Report-020322.pdf";
  var care = {
    2018: { n: 9504, href: careReport, name: "Child Care Aware, Demanding Change" },
    2019: { n: 9687, href: careReport, name: "Child Care Aware, Demanding Change" },
    2020: { n: 10174, href: careReport, name: "Child Care Aware, Demanding Change" },
    2022: { n: 10853, href: "https://www.childcareaware.org/catalyzing-growth-using-data-to-change-child-care-2022/", name: "Child Care Aware, 2022 price of care" },
    2023: { n: 11582, href: "https://www.childcareaware.org/thechildcarestandstill/", name: "Child Care Aware, 2023 price of care" },
    2024: { n: 13128, href: "https://www.childcareaware.org/price-landscape24/", name: "Child Care Aware, 2024 price of care" },
    2025: { n: 13184, href: "https://info.childcareaware.org/price-and-supply-2025", name: "Child Care Aware, 2025 price of care" }
  };
  var petReport = "https://www.petfoodprocessing.net/articles/19123-us-pet-food-treat-industry-amasses-65-billion-in-sales";
  var pets = {
    2023: { sales: 147e9, homes: 82e6, href: petReport, name: "APPA 2025 State of the Industry" },
    2024: { sales: 152e9, homes: 94e6, href: petReport, name: "APPA 2025 State of the Industry" },
    2025: { sales: 158e9, homes: 95e6, href: "https://americanpetproducts.org/news/u.s.-pet-industry-reaches-158-billion-in-2025-poised-for-continued-growth-in-2026", name: "APPA, 2025 pet industry sales" }
  };
  var jobs = {
    2012: 8.1, 2013: 7.4, 2014: 6.2, 2015: 5.3, 2016: 4.9, 2017: 4.4, 2018: 3.9,
    2019: 3.7, 2020: 8.1, 2021: 5.3, 2022: 3.6, 2023: 3.6, 2024: 4.0, 2025: 4.3
  };
  var jobMonth = { year: 2026, month: "October", n: 4.1, priorMonth: "September", prior: 4.2 };
  var aid = {
    2023: { n: 20.9, people: "69.6 million" }
  };
  var home = {
    2025: { count: 745652, pop: 341784857 }
  };
  var shelterDistricts = {
    2026: [
      { name: "Jamaica-St. Albans-Hollis", place: "Queens", people: 8369 },
      { name: "Astoria-Queensbridge", place: "Queens", people: 4532 },
      { name: "Ocean Hill-Brownsville", place: "Brooklyn", people: 3985 },
      { name: "Midtown-Flatiron-Union Square", place: "Manhattan", people: 3140 },
      { name: "East New York-Cypress Hills", place: "Brooklyn", people: 2957 }
    ]
  };
  var snapTracts = {
    2024: [
      { tract: "Census Tract 6", neighborhood: "Chinatown-Two Bridges", place: "Manhattan", census: "New York County", snap: 2495, all: 5393, moe: 596 },
      { tract: "Census Tract 393", neighborhood: "Belmont", place: "the Bronx", census: "Bronx County", snap: 2131, all: 3092, moe: 343 },
      { tract: "Census Tract 342", neighborhood: "Coney Island-Sea Gate", place: "Brooklyn", census: "Kings County", snap: 2058, all: 2927, moe: 370 },
      { tract: "Census Tract 175", neighborhood: "Concourse-Concourse Village", place: "the Bronx", census: "Bronx County", snap: 1955, all: 2975, moe: 517 },
      { tract: "Census Tract 51", neighborhood: "Mott Haven-Port Morris", place: "the Bronx", census: "Bronx County", snap: 1951, all: 2930, moe: 379 }
    ]
  };
  var gasLive = null;
  var gasFromBls = {};
  var spendFromBls = {};
  var gpas = { 1990: 2.68, 1994: 2.79, 1998: 2.90, 2000: 2.94, 2005: 2.98, 2009: 3.00, 2019: 3.11 };
  var gpaYears = [1990, 1994, 1998, 2000, 2005, 2009, 2019];
  var cards = {
    gas: document.querySelector(".life-gas"),
    spend: document.querySelector(".life-living"),
    care: document.querySelector(".life-child"),
    trip: document.querySelector(".life-trip"),
    date: document.querySelector(".life-date"),
    gpa: document.querySelector(".life-gpa"),
    pet: document.querySelector(".life-pet"),
    job: document.querySelector(".life-job"),
    aid: document.querySelector(".life-aid"),
    home: document.querySelector(".life-home")
  };

  function rate(n, digits) {
    return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%";
  }
  function count(n) {
    return n.toLocaleString("en-US");
  }
  function money(n, digits) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }
  function text(id, value) {
    document.getElementById(id).textContent = value;
  }
  function link(id, href, name) {
    var node = document.getElementById(id);
    node.href = href;
    node.textContent = name;
  }
  function empty(card, numId, unit, whatId, what) {
    card.classList.add("is-empty");
    text(numId, "—");
    text(numId.replace("-num", "-unit"), unit);
    text(whatId, what);
  }
  function nearestGpa(year) {
    var best = null;
    gpaYears.forEach(function (y) { if (y <= year) best = y; });
    return best;
  }
  function latestKey(map, year) {
    var best = null;
    Object.keys(map).forEach(function (key) {
      var y = Number(key);
      if (y <= year && (best === null || y > best)) best = y;
    });
    return best;
  }
  var selected = {};
  var pinned = {};
  function sortedKeys(map) {
    return Object.keys(map).map(Number).filter(function (y) { return map[y] != null; }).sort(function (a, b) { return a - b; });
  }
  function yearList(key) {
    if (key === "gas") {
      var list = sortedKeys(gasAnnual);
      var liveYear = gasLive ? gasLive.year : 2026;
      if (gasAnnual[liveYear] == null && list.indexOf(liveYear) < 0) list.push(liveYear);
      list.sort(function (a, b) { return a - b; });
      return list;
    }
    if (key === "spend") return sortedKeys(spend);
    if (key === "care") return sortedKeys(care);
    if (key === "pet") return sortedKeys(pets);
    if (key === "trip") return sortedKeys(trips);
    if (key === "date") return sortedKeys(dates);
    if (key === "job") {
      var jobYears = sortedKeys(jobs);
      if (jobYears.indexOf(jobMonth.year) < 0) jobYears.push(jobMonth.year);
      return jobYears;
    }
    if (key === "aid") return sortedKeys(snapTracts);
    if (key === "home") return sortedKeys(shelterDistricts);
    return gpaYears.filter(function (y) { return gpas[y] != null; });
  }
  function atPresent(key, year) {
    var list = yearList(key);
    return list.length > 0 && year === list[list.length - 1];
  }
  function stamp(key, year) {
    if (!sliders[key] || year == null || year !== year) return;
    var shown = String(year);
    sliders[key].setAttribute("aria-valuenow", shown);
    sliders[key].setAttribute("aria-valuetext", shown);
    var out = document.getElementById(key + "-year-out");
    if (out) {
      out.value = shown;
      out.textContent = shown;
    }
    var glance = document.getElementById(key + "-year-glance");
    if (glance) glance.textContent = shown;
  }
  function syncSlider(key) {
    var list = yearList(key);
    var input = sliders[key];
    if (!input || !list.length) return;
    var year = selected[key];
    if (!pinned[key] || year == null || list.indexOf(year) < 0) year = list[list.length - 1];
    selected[key] = year;
    input.min = "0";
    input.max = String(list.length - 1);
    input.value = String(list.indexOf(year));
    input.setAttribute("aria-valuemin", String(list[0]));
    input.setAttribute("aria-valuemax", String(list[list.length - 1]));
    document.getElementById(key + "-year-start").textContent = String(list[0]);
    document.getElementById(key + "-year-end").textContent = String(list[list.length - 1]);
    stamp(key, year);
  }
  function previousYear(list, year) {
    var best = null;
    list.forEach(function (y) { if (y < year) best = y; });
    return best;
  }
  function showCare(year) {
    stamp("care", year);
    var card = cards.care;
    var row = care[year];
    var past = document.getElementById("care-past");
    var prior = previousYear(yearList("care"), year);
    if (!row) {
      empty(card, "care-num", "average annual price of child care", "care-what", "Child Care Aware has not published this national price for " + year + ".");
      document.getElementById("care-track").style.setProperty("--fill", "0%");
      past.hidden = true;
      document.getElementById("care-key").textContent = "";
      return;
    }
    card.classList.remove("is-empty");
    text("care-num", money(row.n, 0));
    text("care-unit", "average annual price of child care");
    document.getElementById("care-track").style.setProperty("--fill", (row.n / 15000 * 100).toFixed(1) + "%");
    past.hidden = prior == null;
    if (prior != null) past.style.left = (care[prior].n / 15000 * 100).toFixed(1) + "%";
    document.getElementById("care-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>" + (prior == null ? "" : '<span><i class="dot past"></i> ' + money(care[prior].n, 0) + " in " + prior + "</span>");
    var what = "Child Care Aware of America. This is the national average annual price, the average of three ways of combining state prices for infants and 4-year-olds in centers and in family child care homes. School-age care is not included. It is the price of care, not the spending of a home without a child in care. State prices differ widely. The bar runs from $0 to $15,000.";
    if (prior != null) what += " The tick is " + money(care[prior].n, 0) + ", " + prior + ".";
    if (year === 2022) what += " 2021 is not on this slider because that report did not publish this same national figure.";
    text("care-what", what);
    link("care-src", row.href, row.name);
    document.getElementById("care-viz").setAttribute("aria-label", "In " + year + " the national average price of child care was " + money(row.n, 0) + ", on a scale from 0 to 15,000 dollars.");
  }
  function petAverage(row) {
    return Math.round(row.sales / row.homes);
  }
  function showPet(year) {
    stamp("pet", year);
    var card = cards.pet;
    var row = pets[year];
    var past = document.getElementById("pet-past");
    var prior = previousYear(yearList("pet"), year);
    if (!row) {
      empty(card, "pet-num", "per household that owns a pet", "pet-what", "A pet-owning household figure has not been published for " + year + ".");
      document.getElementById("pet-track").style.setProperty("--fill", "0%");
      past.hidden = true;
      document.getElementById("pet-key").textContent = "";
      return;
    }
    var amount = petAverage(row);
    card.classList.remove("is-empty");
    text("pet-num", money(amount, 0));
    text("pet-unit", "per household that owns a pet, " + year);
    document.getElementById("pet-track").style.setProperty("--fill", (amount / 2500 * 100).toFixed(1) + "%");
    past.hidden = prior == null;
    if (prior != null) past.style.left = (petAverage(pets[prior]) / 2500 * 100).toFixed(1) + "%";
    document.getElementById("pet-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>" + (prior == null ? "" : '<span><i class="dot past"></i> ' + money(petAverage(pets[prior]), 0) + " in " + prior + "</span>");
    var what = "American Pet Products Association. In " + year + " the pet industry’s sales were $" + (row.sales / 1e9) + " billion, and " + (row.homes / 1e6) + " million households owned a pet. Dividing those figures gives " + money(amount, 0) + " per pet-owning household. Homes without a pet are not in that count. The bar runs from $0 to $2,500.";
    if (prior != null) what += " The tick is " + money(petAverage(pets[prior]), 0) + ", " + prior + ".";
    if (year === 2024) what += " More households owned a pet than in 2023, and industry sales rose by less, so this average is lower.";
    text("pet-what", what);
    link("pet-src", row.href, row.name);
    document.getElementById("pet-viz").setAttribute("aria-label", "In " + year + ", " + money(amount, 0) + " of pet industry sales per household that owns a pet, on a scale from 0 to 2,500 dollars.");
  }
  function showJob(year) {
    if (!sliders.job) return;
    stamp("job", year);
    var card = cards.job;
    var past = document.getElementById("job-past");
    var scale = 15;
    var n;
    var tickN = null;
    var tickLabel = "";
    var what;
    var href = "https://www.bls.gov/cps/tables.htm";
    var srcName = "BLS annual averages, Current Population Survey";
    if (year === jobMonth.year) {
      n = jobMonth.n;
      tickN = jobMonth.prior;
      tickLabel = rate(jobMonth.prior, 1) + " in " + jobMonth.priorMonth + " " + year;
      text("job-unit", "of the labor force, " + jobMonth.month + " " + year);
      what = "Bureau of Labor Statistics, Current Population Survey, seasonally adjusted. This is the unemployment rate for " + jobMonth.month + " " + year + ", the share of the labor force without a job and looking for one. It is not an average for the year. A " + year + " annual average has not been published. The bar runs from 0% to 15%. The tick is " + tickLabel + ".";
      href = "https://fred.stlouisfed.org/series/UNRATE";
      srcName = "FRED UNRATE, from BLS";
      document.getElementById("job-key").innerHTML = '<span><i class="dot now"></i> ' + jobMonth.month + " " + year + '</span><span><i class="dot past"></i> ' + tickLabel + "</span>";
    } else if (jobs[year] != null) {
      n = jobs[year];
      var prior = previousYear(yearList("job").filter(function (y) { return y !== jobMonth.year; }), year);
      if (prior != null) {
        tickN = jobs[prior];
        tickLabel = rate(jobs[prior], 1) + " in " + prior;
      }
      text("job-unit", "of the labor force, annual average");
      what = "Bureau of Labor Statistics, Current Population Survey. This is the annual average unemployment rate for " + year + ", the share of the labor force without a job and looking for one. The bar runs from 0% to 15%.";
      if (prior != null) what += " The tick is " + tickLabel + ".";
      if (year === 2025) what += " The 2025 average uses 11 months. BLS did not collect October 2025 during a lapse in federal funding, so this year is not strictly comparable with the other years.";
      document.getElementById("job-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>" + (tickLabel ? '<span><i class="dot past"></i> ' + tickLabel + "</span>" : "");
    } else {
      empty(card, "job-num", "of the labor force", "job-what", "No unemployment rate is on this card for " + year + ".");
      document.getElementById("job-track").style.setProperty("--fill", "0%");
      past.hidden = true;
      document.getElementById("job-key").textContent = "";
      return;
    }
    card.classList.remove("is-empty");
    text("job-num", rate(n, 1));
    document.getElementById("job-track").style.setProperty("--fill", (n / scale * 100).toFixed(1) + "%");
    past.hidden = tickN == null;
    if (tickN != null) past.style.left = (tickN / scale * 100).toFixed(1) + "%";
    text("job-what", what);
    link("job-src", href, srcName);
    document.getElementById("job-viz").setAttribute("aria-label", "In " + year + ", " + rate(n, 1) + " of the labor force was unemployed, on a scale from 0 to 15 percent." + (tickLabel ? " The tick is " + tickLabel + "." : ""));
  }
  function showAid(year) {
    if (!sliders.aid) return;
    stamp("aid", year);
    var card = cards.aid;
    var rows = snapTracts[year];
    var list = document.getElementById("snap-viz");
    if (!rows || !rows.length) {
      empty(card, "aid-num", "SNAP households", "aid-what", "This neighborhood list is not on this card for " + year + ".");
      if (list) list.innerHTML = "";
      document.getElementById("aid-key").textContent = "";
      return;
    }
    var top = rows[0];
    card.classList.remove("is-empty");
    text("aid-num", count(top.snap));
    text("aid-unit", top.neighborhood + ", the neighborhood with the most SNAP households");
    document.getElementById("aid-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>";
    showSnap(year);
    var nation = aid[2023];
    text("aid-what", "U.S. Department of Health and Human Services, Indicator 3 of the 25th Welfare Indicators and Risk Factors report. In 2023, " + rate(nation.n, 1) + " of the population, " + nation.people + " people, received or lived with a family member who received TANF, SNAP, or SSI in any amount at any point during the year. An average-month caseload is a different measure. TANF cash assistance, the program long called welfare, reached 0.8 percent of people, 2.7 million, in an average month of 2024. This report’s latest year for that recipiency rate is 2023.");
    link("aid-src", "https://aspe.hhs.gov/sites/default/files/documents/9726be6ff81604c026fb82eceec5d716/25th%20Welfare%20Indicators%20Report%20to%20Congress.pdf", "HHS, 25th Welfare Indicators report");
  }
  function showHome(year) {
    if (!sliders.home) return;
    stamp("home", year);
    var card = cards.home;
    var rows = shelterDistricts[year];
    var list = document.getElementById("shelter-viz");
    if (!rows || !rows.length) {
      empty(card, "home-num", "people counted as homeless", "home-what", "This place list is not on this card for " + year + ".");
      if (list) list.innerHTML = "";
      document.getElementById("home-key").textContent = "";
      return;
    }
    var top = rows[0];
    var nation = home[2025];
    card.classList.remove("is-empty");
    text("home-num", count(top.people));
    text("home-unit", "people in shelters in " + top.name + ", the neighborhood with the most homeless people");
    list.innerHTML = "";
    var spoken = [];
    rows.forEach(function (row) {
      var li = document.createElement("li");
      var num = document.createElement("b");
      num.textContent = count(row.people);
      var body = document.createElement("div");
      var place = document.createElement("p");
      place.className = "rank-place";
      place.textContent = row.name;
      var meta = document.createElement("p");
      meta.className = "rank-meta";
      meta.textContent = row.place + " · in shelters";
      body.appendChild(place);
      body.appendChild(meta);
      li.appendChild(num);
      li.appendChild(body);
      list.appendChild(li);
      spoken.push(row.name + ", " + row.place + ", " + count(row.people) + " people in shelters");
    });
    list.setAttribute("aria-label", "Neighborhoods with the most people in New York City shelters on October 31, " + year + ". " + spoken.join(". ") + ".");
    document.getElementById("home-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>";
    var lines = rows.map(function (row) {
      return row.name + " in " + row.place + ", " + count(row.people);
    }).join(". ");
    var share = "";
    if (nation) {
      var pct = nation.count / nation.pop * 100;
      var per = Math.round(nation.count / nation.pop * 10000);
      share = " HUD’s national count is not by neighborhood. On one night in January 2025 it counted " + count(nation.count) + " people. Leaders.vote divided that count by the Census Bureau’s July 1, 2025 population, " + count(nation.pop) + ". HUD did not publish this percentage. That is " + rate(pct, 2) + ", about " + count(per) + " people in every 10,000.";
    }
    text("home-what", top.name + " had the most people in New York City shelters on October 31, " + year + ": " + count(top.people) + ". Department of Homeless Services census of individuals, counted at the shelter’s community district. These are people in shelters and shelter hotels. Unsheltered people are not in this count. The name is the City Planning name for that district. " + lines + "." + share);
    link("home-src", "https://data.cityofnewyork.us/d/veav-vj3r", "NYC Department of Homeless Services, shelter census");
  }
  function showSnap(year) {
    var rows = snapTracts[year];
    var list = document.getElementById("snap-viz");
    if (!list) return;
    if (!rows || !rows.length) {
      list.innerHTML = "";
      text("snap-what", "This tract list is not on this card for " + year + ".");
      return;
    }
    text("snap-label", "Neighborhoods with the most people on SNAP, " + year);
    list.innerHTML = "";
    var spoken = [];
    rows.forEach(function (row) {
      var li = document.createElement("li");
      var pct = row.snap / row.all * 100;
      var num = document.createElement("b");
      num.textContent = count(row.snap);
      var body = document.createElement("div");
      var place = document.createElement("p");
      place.className = "rank-place";
      place.textContent = row.neighborhood;
      var meta = document.createElement("p");
      meta.className = "rank-meta";
      meta.textContent = row.place + " · " + rate(pct, 1) + " of households";
      body.appendChild(place);
      body.appendChild(meta);
      li.appendChild(num);
      li.appendChild(body);
      list.appendChild(li);
      spoken.push(row.neighborhood + ", " + row.place + ", " + row.tract + ", " + count(row.snap) + " households, " + rate(pct, 1) + ", margin " + count(row.moe));
    });
    list.setAttribute("aria-label", "Neighborhoods with the most people on SNAP. The count is SNAP households in one census tract in that neighborhood, from the " + year + " five-year estimates. " + spoken.join(". ") + ".");
    var margins = rows.map(function (row) {
      return row.neighborhood + " is " + row.tract + " in " + row.place + ", " + count(row.snap) + " households, margin " + count(row.moe);
    }).join(". ");
    text("snap-what", "These are the neighborhoods with the most people on SNAP. Census Bureau, American Community Survey " + year + " five-year estimates, table B22003, for census tracts in the 50 states and the District of Columbia. A tract is a small Census area. It is the geography nearest to a neighborhood, and the Census does not publish a neighborhood ranking. The name on each row is the Neighborhood Tabulation Area from the New York City Department of City Planning, the neighborhood that contains that tract. The household count is for the tract. The rest of the neighborhood is not included. These are households that received SNAP in the past 12 months, and the count is of households. " + margins + ". Margins of error overlap, so a neighborhood next to another on this list may be just as large. The percent beside a name is that tract’s share of its own households. The estimates cover " + (year - 4) + " through " + year + ".");
    link("snap-src", "https://data.census.gov/table/ACSDT5Y" + year + ".B22003", "Census ACS " + year + ", table B22003");
  }
  function choose(key) {
    var list = yearList(key);
    var index = Math.round(Number(sliders[key].value));
    if (!isFinite(index)) index = list.length - 1;
    if (index < 0) index = 0;
    if (index > list.length - 1) index = list.length - 1;
    sliders[key].value = String(index);
    var year = list[index];
    pinned[key] = year !== list[list.length - 1];
    selected[key] = year;
    return year;
  }
  function fillSpend(parts, one) {
    var stack = document.getElementById("spend-stack");
    var key = document.getElementById("spend-key");
    stack.classList.toggle("is-one", one);
    stack.innerHTML = "";
    key.innerHTML = "";
    parts.forEach(function (part) {
      var seg = document.createElement("span");
      seg.className = "seg " + part.cls;
      if (part.flex) seg.style.flex = String(part.flex);
      if (part.width) seg.style.width = part.width;
      stack.appendChild(seg);
      var li = document.createElement("li");
      var sw = document.createElement("i");
      sw.className = "seg " + part.cls;
      li.appendChild(sw);
      li.appendChild(document.createTextNode(" " + part.label));
      key.appendChild(li);
    });
  }
  function cells(onCount) {
    var box = document.getElementById("trip-cells");
    var marks = box.querySelectorAll("i");
    for (var i = 0; i < marks.length; i++) marks[i].classList.toggle("on", i < onCount);
  }

  function showGas(year) {
    stamp("gas", year);
    var gasCard = cards.gas;
    var past = document.getElementById("gas-past");
    if (gasLive && year === gasLive.year && gasAnnual[year] == null) {
      gasCard.classList.remove("is-empty");
      text("gas-num", money(gasLive.value, 2));
      text("gas-unit", gasLive.unit || ("per gallon, " + gasLive.month + " " + gasLive.year));
      document.getElementById("gas-track").style.setProperty("--fill", (gasLive.value / 5 * 100).toFixed(1) + "%");
      past.hidden = gasLive.ago == null;
      if (gasLive.ago != null) past.style.left = (gasLive.ago / 5 * 100).toFixed(1) + "%";
      document.getElementById("gas-key").innerHTML = '<span><i class="dot now"></i> ' + (gasLive.label || (gasLive.month + " " + gasLive.year)) + "</span>" + (gasLive.ago == null ? "" : '<span><i class="dot past"></i> ' + money(gasLive.ago, 2) + " a year earlier</span>");
      text("gas-what", gasLive.what || ("Bureau of Labor Statistics U.S. city average for unleaded regular, " + money(gasLive.value, 2) + " in " + gasLive.month + " " + gasLive.year + ". This is the latest month on the feed, read when the page opens. It is not a full-year average. The bar runs from $0 to $5." + (gasLive.ago == null ? "" : " The tick is " + money(gasLive.ago, 2) + ", " + gasLive.month + " the year before.")));
      link("gas-src", gasLive.href || "https://data.bls.gov/timeseries/APU000074714", gasLive.name || "BLS average price, unleaded regular");
      document.getElementById("gas-viz").setAttribute("aria-label", "In " + (gasLive.label || (gasLive.month + " " + gasLive.year)) + " the average was " + money(gasLive.value, 2) + " a gallon.");
    } else if (year === 2026 && gasAnnual[2026] == null) {
      gasCard.classList.remove("is-empty");
      text("gas-num", "$4.04");
      text("gas-unit", "per gallon on November 7");
      document.getElementById("gas-track").style.setProperty("--fill", "80.7%");
      past.hidden = false;
      past.style.left = "61.6%";
      document.getElementById("gas-key").innerHTML = '<span><i class="dot now"></i> November 7, 2026</span><span><i class="dot past"></i> $3.08 a year earlier</span>';
      text("gas-what", "Not the year’s average. AAA’s national average was $4.04 a gallon on November 7, 2026. The bar runs from $0 to $5, and the tick is AAA’s average from a year before, $3.08. A newer month replaces this when the Bureau of Labor Statistics feed can be read.");
      link("gas-src", "https://gasprices.aaa.com/", "AAA Fuel Prices");
      document.getElementById("gas-viz").setAttribute("aria-label", "A scale from 0 to 5 dollars a gallon. On November 7, 2026 the average was 4 dollars and 4 cents. A tick marks 3 dollars and 8 cents a year earlier.");
    } else if (gasAnnual[year] != null) {
      gasCard.classList.remove("is-empty");
      var price = gasAnnual[year];
      var ago = gasAnnual[year - 1];
      text("gas-num", money(price, 2));
      text("gas-unit", "per gallon, annual average");
      document.getElementById("gas-track").style.setProperty("--fill", (price / 5 * 100).toFixed(1) + "%");
      past.hidden = ago == null;
      if (ago != null) past.style.left = (ago / 5 * 100).toFixed(1) + "%";
      document.getElementById("gas-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>" + (ago == null ? "" : '<span><i class="dot past"></i> ' + money(ago, 2) + " the year before</span>");
      text("gas-what", (gasFromBls[year]
        ? "Bureau of Labor Statistics average of the monthly U.S. city prices for unleaded regular, " + money(price, 2) + " a gallon. The bar runs from $0 to $5."
        : "Energy Information Administration annual average for regular gasoline, all formulations, " + money(price, 2) + " a gallon. The bar runs from $0 to $5.") + (ago == null ? "" : " The tick is " + money(ago, 2) + ", the year before."));
      link("gas-src", gasFromBls[year] ? "https://data.bls.gov/timeseries/APU000074714" : "https://fred.stlouisfed.org/data/GASREGA", gasFromBls[year] ? "BLS average price, unleaded regular" : "EIA via FRED, regular gasoline");
      document.getElementById("gas-viz").setAttribute("aria-label", "Annual average regular gasoline in " + year + " was " + money(price, 2) + " a gallon, on a scale from 0 to 5.");
    } else {
      empty(gasCard, "gas-num", "per gallon of regular", "gas-what", "The Energy Information Administration’s annual series for regular gasoline starts in 1992.");
      document.getElementById("gas-track").style.setProperty("--fill", "0%");
      past.hidden = true;
      document.getElementById("gas-key").textContent = "";
      link("gas-src", "https://fred.stlouisfed.org/data/GASREGA", "EIA via FRED, regular gasoline");
      document.getElementById("gas-viz").setAttribute("aria-label", "No annual gasoline average for " + year + ".");
    }

  }

  function showSpend(year) {
    stamp("spend", year);
    var spendCard = cards.spend;
    var spendYear = spend[year] != null ? year : (atPresent("spend", year) ? latestKey(spend, year) : null);
    if (spendYear != null) {
      spendCard.classList.remove("is-empty");
      text("spend-num", money(spend[spendYear], 0));
      text("spend-unit", "spent in " + spendYear + ", per consumer unit");
      if (spendYear === 2025) {
        fillSpend(spendParts, false);
        text("spend-what", (spendYear === year ? "" : "No total is published for " + year + ". This card keeps the latest one, " + spendYear + ". ") + "Bureau of Labor Statistics, Consumer Expenditure Survey. A consumer unit is a household that shares its major bills. The bar is one year of spending, largest share first. Dots mark the remainder, which is not one category. The survey missed October and November 2025 during a lapse in federal funding, and BLS adjusted the weights.");
        link("spend-src", "https://www.bls.gov/news.release/cesan.htm", "BLS Consumer Expenditures, 2025");
        document.getElementById("spend-stack").setAttribute("aria-label", "Shares of 2025 spending. Housing 27,790 dollars. Remainder 19,815 dollars. Transportation 13,492 dollars. Food 10,633 dollars. Insurance and pensions 10,175 dollars.");
      } else {
        var width = (spend[spendYear] / spend[2025] * 100).toFixed(1) + "%";
        fillSpend([{ cls: "seg-house", width: width, label: spendYear + " spending, against the $81,905 of 2025" }], true);
        var note = (spendYear === year ? "" : "No total is published for " + year + ". This card keeps the latest one, " + spendYear + ". ") + "Bureau of Labor Statistics, Consumer Expenditure Survey. The blue piece is this year set against $81,905, the 2025 total. The five-way split is published for 2025.";
        if (spendYear === 2024 && spend[spendYear] === 78527) note += " The 2025 release corrected 2024 to $78,527.";
        text("spend-what", note);
        link("spend-src", spendFromBls[spendYear] ? "https://data.bls.gov/timeseries/CXUTOTALEXPLB0101M" : (spendYear >= 2024 ? "https://www.bls.gov/news.release/cesan.htm" : "https://fred.stlouisfed.org/data/CXUTOTALEXPLB0101M"), spendFromBls[spendYear] ? "BLS consumer expenditures" : (spendYear >= 2024 ? "BLS Consumer Expenditures, 2025" : "BLS via FRED, consumer expenditures"));
        document.getElementById("spend-stack").setAttribute("aria-label", "Average annual spending in " + spendYear + " was " + money(spend[spendYear], 0) + ", shown against 81,905 dollars in 2025.");
      }
    } else {
      empty(spendCard, "spend-num", "spent per consumer unit", "spend-what", "The Consumer Expenditure Survey has not published " + year + ". The latest total is $81,905, for 2025.");
      fillSpend([], false);
      link("spend-src", "https://www.bls.gov/news.release/cesan.htm", "BLS Consumer Expenditures, 2025");
      document.getElementById("spend-stack").setAttribute("aria-label", "No spending total for " + year + ".");
    }

  }

  function showTrip(year) {
    stamp("trip", year);
    var tripYear = trips[year] ? year : (atPresent("trip", year) ? latestKey(trips, year) : null);
    var trip = tripYear != null ? trips[tripYear] : null;
    var tripCard = cards.trip;
    if (trip) {
      tripCard.classList.remove("is-empty");
      text("trip-num", money(trip.n, 0));
      text("trip-unit", "expected for a summer " + tripYear + " trip");
      var baseYear = spend[tripYear] ? tripYear : (spend[2025] ? 2025 : latestKey(spend, tripYear));
      var pct = trip.n / spend[baseYear] * 100;
      var lit = Math.max(1, Math.round(pct / 5));
      cells(lit);
      var cap = pct.toFixed(1) + "% of " + (baseYear === year ? "this year’s" : baseYear) + " average spending";
      document.getElementById("trip-cap").innerHTML = "<i></i> " + cap;
      text("trip-what", (tripYear === year ? "" : "No survey for " + year + ". This card keeps the latest one, " + tripYear + ". ") + "NerdWallet’s survey of people planning a summer " + tripYear + " vacation with a flight or paid lodging. They expected to spend " + money(trip.n, 0) + ". The gold cell is that amount against " + money(spend[baseYear], 0) + " of " + baseYear + " spending. It leaves out people who are not taking that kind of trip.");
      link("trip-src", trip.href, trip.name);
      document.getElementById("trip-viz").setAttribute("aria-label", money(trip.n, 0) + " is " + pct.toFixed(1) + " percent of average spending in " + baseYear + ".");
    } else {
      empty(tripCard, "trip-num", "expected summer trip", "trip-what", "NerdWallet’s summer travel survey was not published with a comparable average for " + year + ". The years on this card are 2023, 2024, 2025, and 2026.");
      cells(0);
      document.getElementById("trip-cap").innerHTML = "<i></i> No survey for this year";
      link("trip-src", "https://www.nerdwallet.com/travel/studies/summer-travel-report", "NerdWallet summer travel reports");
      document.getElementById("trip-viz").setAttribute("aria-label", "No vacation survey for " + year + ".");
    }

  }

  function showDate(year) {
    stamp("date", year);
    var dateYear = dates[year] ? year : (atPresent("date", year) ? latestKey(dates, year) : null);
    var date = dateYear != null ? dates[dateYear] : null;
    var dateCard = cards.date;
    var band = document.getElementById("date-band");
    var mark = document.getElementById("date-now");
    if (date) {
      dateCard.classList.remove("is-empty");
      text("date-num", money(date.n, 0));
      text("date-unit", "average spend on a first date");
      var at = (date.exact / 150 * 100).toFixed(1);
      mark.hidden = false;
      mark.style.left = at + "%";
      band.hidden = !date.band;
      if (date.band) {
        band.style.left = "60.7%";
        band.style.width = "39.3%";
        document.getElementById("date-key").innerHTML = '<span><i class="dot tick"></i> Average, $92.91</span><span><i class="dot band"></i> Most of this group, $91–$150</span>';
        text("date-what", (dateYear === year ? "" : "No survey for " + year + ". This card keeps the latest one, " + dateYear + ". ") + "J.G. Wentworth surveyed 1,538 U.S. adults in March 2026. The average is for people who are dating or in a relationship. The mark sits at the low end of the band where about three in four of them spend.");
        document.getElementById("date-viz").setAttribute("aria-label", "A scale from 0 to 150 dollars. The 2026 average is 93 dollars, at the low end of the band from 91 to 150 dollars.");
      } else {
        document.getElementById("date-key").innerHTML = '<span><i class="dot tick"></i> Average, ' + money(date.exact, 0) + "</span>";
        text("date-what", (dateYear === year ? "" : "No survey for " + year + ". This card keeps the latest one, " + dateYear + ". ") + (dateYear === 2019
          ? "LendingTree’s survey, fielded in January 2020, asked what people spent on a first date in 2019. The average was $77. The scale runs from $0 to $150, the same scale as the 2026 survey."
          : "LendingTree’s 2022 survey put the average first date at $91. The scale runs from $0 to $150, the same scale as the other years on this card. Surveys differ, so the years are not one continuous series."));
        document.getElementById("date-viz").setAttribute("aria-label", "A scale from 0 to 150 dollars. The " + dateYear + " average first date was " + date.exact + " dollars.");
      }
      link("date-src", date.href, date.name);
    } else {
      empty(dateCard, "date-num", "average spend on a first date", "date-what", "No comparable national survey of first-date spending for " + year + ". This card has 2019, 2022, and 2026, and those surveys are not one series.");
      mark.hidden = true;
      band.hidden = true;
      document.getElementById("date-key").textContent = "";
      link("date-src", "https://www.jgwentworth.com/resources/cost-of-dating-2026", "J.G. Wentworth, cost of dating 2026");
      document.getElementById("date-viz").setAttribute("aria-label", "No first-date survey for " + year + ".");
    }

  }

  function showGpa(year) {
    stamp("gpa", year);
    var gpaYear = gpas[year] != null ? year : (atPresent("gpa", year) ? nearestGpa(year) : null);
    var gpa = gpaYear != null ? gpas[gpaYear] : null;
    var gpaCard = cards.gpa;
    var prior = nearestGpa(year);
    document.querySelectorAll(".spark circle").forEach(function (dot) {
      var on = Number(dot.getAttribute("data-year")) === gpaYear;
      dot.setAttribute("r", on ? "4.2" : "2.6");
      dot.classList.toggle("is-on", on);
    });
    if (gpa != null) {
      gpaCard.classList.remove("is-empty");
      text("gpa-num", gpa.toFixed(2));
      text("gpa-unit", "unweighted, class of " + gpaYear);
      document.getElementById("gpa-fill").style.width = (gpa / 4 * 100).toFixed(2) + "%";
      text("gpa-what", (gpaYear === year ? "" : "No transcript study for the class of " + year + ". This card keeps the latest one, the class of " + gpaYear + ". ") + "National Center for Education Statistics, from high school transcripts. The bar is the full 0 to 4.0 scale. The line under it is zoomed from 2.50 to 3.30 and marks 1990, 2000, 2009, and 2019. Studies were not done every year.");
      if (gpaYear === 2019) link("gpa-src", "https://www.nationsreportcard.gov/hstsreport/", "2019 NAEP High School Transcript Study");
      else link("gpa-src", "https://www.nationsreportcard.gov/hsts_2009/course_gpa.aspx", "2009 NAEP High School Transcript Study");
      document.getElementById("gpa-viz").setAttribute("aria-label", "The class of " + gpaYear + " averaged " + gpa.toFixed(2) + " on a 4.0 scale.");
    } else {
      empty(gpaCard, "gpa-num", "unweighted high school GPA", "gpa-what", prior == null
        ? "The transcript studies begin with the class of 1990."
        : "No transcript study for the class of " + year + ". The class of " + prior + " averaged " + gpas[prior].toFixed(2) + ".");
      document.getElementById("gpa-fill").style.width = "0%";
      link("gpa-src", "https://www.nationsreportcard.gov/hstsreport/", "NAEP High School Transcript Study");
      document.getElementById("gpa-viz").setAttribute("aria-label", "No transcript study for the class of " + year + ".");
    }
  }

  function blsRows(json) {
    if (!json || json.status !== "REQUEST_SUCCEEDED" || !json.Results || !json.Results.series || !json.Results.series[0]) return [];
    return json.Results.series[0].data || [];
  }
  function showAll() {
    syncSlider("gas");
    syncSlider("spend");
    syncSlider("care");
    syncSlider("trip");
    syncSlider("date");
    syncSlider("gpa");
    syncSlider("pet");
    syncSlider("job");
    syncSlider("aid");
    syncSlider("home");
    showGas(selected.gas);
    showSpend(selected.spend);
    showCare(selected.care);
    showTrip(selected.trip);
    showDate(selected.date);
    showGpa(selected.gpa);
    showPet(selected.pet);
    showJob(selected.job);
    showAid(selected.aid);
    showHome(selected.home);
  }
  function refreshBls() {
    var end = new Date().getFullYear() + 1;
    return Promise.all([
      fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/APU000074714?startyear=2024&endyear=" + end).then(function (response) { return response.json(); }),
      fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/CXUTOTALEXPLB0101M?startyear=2016&endyear=" + end).then(function (response) { return response.json(); })
    ]).then(function (both) {
      var months = blsRows(both[0]).filter(function (row) { return row.period.charAt(0) === "M" && row.value !== "-"; });
      months.sort(function (a, b) { return (b.year + b.period).localeCompare(a.year + a.period); });
      if (months.length && !(gasLive && gasLive.href)) {
        var latest = months[0];
        var agoRow = null;
        months.forEach(function (row) {
          if (row.year === String(Number(latest.year) - 1) && row.period === latest.period) agoRow = row;
        });
        gasLive = {
          year: Number(latest.year),
          month: latest.periodName,
          value: Number(latest.value),
          ago: agoRow ? Number(agoRow.value) : null
        };
        var byYear = {};
        months.forEach(function (row) {
          var y = Number(row.year);
          if (!byYear[y]) byYear[y] = [];
          byYear[y].push(Number(row.value));
        });
        Object.keys(byYear).forEach(function (key) {
          var y = Number(key);
          if (byYear[y].length === 12 && gasAnnual[y] == null) {
            var sum = 0;
            byYear[y].forEach(function (n) { sum += n; });
            gasAnnual[y] = Math.round(sum / 12 * 1000) / 1000;
            gasFromBls[y] = true;
          }
        });
      }
      var spendRead = false;
      blsRows(both[1]).forEach(function (row) {
        if (row.period === "A01" && row.value !== "-") {
          spend[Number(row.year)] = Math.round(Number(row.value));
          if (Number(row.year) !== 2025) spendFromBls[Number(row.year)] = true;
          spendRead = true;
        }
      });
      if (gasLive || spendRead) {
        var bits = [];
        if (spendRead) bits.push("Household spending");
        if (gasLive) bits.push("the latest gasoline month");
        var read = bits[0];
        if (bits.length === 2) read += " and " + bits[1];
        var note = document.getElementById("life-year-note");
        note.textContent = "Open Details to change a card’s year. The slider stops on years that were published. Dollars are what people paid then, not today’s prices. " + read + (bits.length === 1 ? " was" : " were") + " read from the Bureau of Labor Statistics just now" + (gasLive ? ", " + gasLive.month + " " + gasLive.year + "." : ".");
      }
      showAll();
    }).catch(function () {});
  }

  function onYear(key, show) {
    if (!sliders[key]) return;
    function apply() { show(choose(key)); }
    sliders[key].addEventListener("input", apply);
    sliders[key].addEventListener("change", apply);
  }
  function applyFeed(feed) {
    if (!feed) return;
    if (feed.gasLive && feed.gasLive.value != null) gasLive = feed.gasLive;
    Object.keys(feed.gasAnnual || {}).forEach(function (key) {
      var year = Number(key);
      if (feed.gasAnnual[key] == null) return;
      gasAnnual[year] = Number(feed.gasAnnual[key]);
      if (feed.gasFromBls && feed.gasFromBls[key]) gasFromBls[year] = true;
    });
    Object.keys(feed.spend || {}).forEach(function (key) {
      var year = Number(key);
      if (feed.spend[key] == null) return;
      spend[year] = Math.round(Number(feed.spend[key]));
      if (feed.spendFromBls && feed.spendFromBls[key] && year !== 2025) spendFromBls[year] = true;
    });
    if (feed.jobMonth) jobMonth = feed.jobMonth;
    Object.keys(feed.jobs || {}).forEach(function (key) {
      if (feed.jobs[key] != null) jobs[Number(key)] = Number(feed.jobs[key]);
    });
    showAll();
  }
  function pullLife() {
    return fetch("life.json?t=" + Math.floor(Date.now() / 900000), { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(applyFeed)
      .catch(function () {});
  }
  onYear("gas", showGas);
  onYear("spend", showSpend);
  onYear("care", showCare);
  onYear("trip", showTrip);
  onYear("date", showDate);
  onYear("gpa", showGpa);
  onYear("pet", showPet);
  onYear("job", showJob);
  onYear("aid", showAid);
  onYear("home", showHome);
  showAll();
  pullLife();
  refreshBls();
  setInterval(pullLife, 15 * 60 * 1000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") pullLife();
  });
})();
