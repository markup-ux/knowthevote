(function () {
  var sliders = {
    gas: document.getElementById("gas-year"),
    spend: document.getElementById("spend-year"),
    care: document.getElementById("care-year"),
    trip: document.getElementById("trip-year"),
    date: document.getElementById("date-year"),
    gpa: document.getElementById("gpa-year"),
    pet: document.getElementById("pet-year")
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
  var pets = {
    2010: 480, 2011: 502, 2012: 522, 2013: 460, 2014: 507, 2015: 528,
    2016: 583, 2017: 710, 2018: 662, 2019: 681, 2020: 690, 2021: 770,
    2022: 741, 2023: 876, 2024: 880, 2025: 997
  };
  var gasLive = null;
  var gasFromBls = {};
  var spendFromBls = {};
  var petFromBls = {};
  var gpas = { 1990: 2.68, 1994: 2.79, 1998: 2.90, 2000: 2.94, 2005: 2.98, 2009: 3.00, 2019: 3.11 };
  var gpaYears = [1990, 1994, 1998, 2000, 2005, 2009, 2019];
  var cards = {
    gas: document.querySelector(".life-gas"),
    spend: document.querySelector(".life-living"),
    care: document.querySelector(".life-child"),
    trip: document.querySelector(".life-trip"),
    date: document.querySelector(".life-date"),
    gpa: document.querySelector(".life-gpa"),
    pet: document.querySelector(".life-pet")
  };

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
    return gpaYears.filter(function (y) { return gpas[y] != null; });
  }
  function atPresent(key, year) {
    var list = yearList(key);
    return list.length > 0 && year === list[list.length - 1];
  }
  function stamp(key, year) {
    sliders[key].setAttribute("aria-valuenow", String(year));
    sliders[key].setAttribute("aria-valuetext", String(year));
    document.getElementById(key + "-year-out").textContent = String(year);
    var glance = document.getElementById(key + "-year-glance");
    if (glance) glance.textContent = String(year);
  }
  function syncSlider(key) {
    var list = yearList(key);
    var input = sliders[key];
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
  function showPet(year) {
    stamp("pet", year);
    var card = cards.pet;
    var amount = pets[year];
    var past = document.getElementById("pet-past");
    var prior = previousYear(yearList("pet"), year);
    if (amount == null) {
      empty(card, "pet-num", "spent on pets, per consumer unit", "pet-what", "The Consumer Expenditure Survey has not published pet spending for " + year + ".");
      document.getElementById("pet-track").style.setProperty("--fill", "0%");
      past.hidden = true;
      document.getElementById("pet-key").textContent = "";
      return;
    }
    card.classList.remove("is-empty");
    text("pet-num", money(amount, 0));
    text("pet-unit", "spent on pets in " + year + ", per consumer unit");
    document.getElementById("pet-track").style.setProperty("--fill", (amount / 1500 * 100).toFixed(1) + "%");
    past.hidden = prior == null;
    if (prior != null) past.style.left = (pets[prior] / 1500 * 100).toFixed(1) + "%";
    document.getElementById("pet-key").innerHTML = '<span><i class="dot now"></i> ' + year + "</span>" + (prior == null ? "" : '<span><i class="dot past"></i> ' + money(pets[prior], 0) + " in " + prior + "</span>");
    var what = "Bureau of Labor Statistics, Consumer Expenditure Survey. This is the average a household spent on pets in " + year + ", including food, supplies, medicine, services, and the veterinarian. Homes without a pet are in the average, so it is lower than what a pet-owning home spends. The bar runs from $0 to $1,500.";
    if (prior != null) what += " The tick is " + money(pets[prior], 0) + ", " + prior + ".";
    if (spend[year]) {
      var pct = amount / spend[year] * 100;
      what += " That is " + pct.toFixed(1) + "% of the " + money(spend[year], 0) + " an average household spent in " + year + ".";
    }
    text("pet-what", what);
    link("pet-src", "https://data.bls.gov/timeseries/CXUPETSLB0101M", "BLS consumer expenditures, pets");
    document.getElementById("pet-viz").setAttribute("aria-label", "In " + year + " the average household spent " + money(amount, 0) + " on pets, on a scale from 0 to 1,500 dollars.");
  }
  function choose(key) {
    var list = yearList(key);
    var year = list[Number(sliders[key].value)];
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
      text("gas-unit", "per gallon, " + gasLive.month + " " + gasLive.year);
      document.getElementById("gas-track").style.setProperty("--fill", (gasLive.value / 5 * 100).toFixed(1) + "%");
      past.hidden = gasLive.ago == null;
      if (gasLive.ago != null) past.style.left = (gasLive.ago / 5 * 100).toFixed(1) + "%";
      document.getElementById("gas-key").innerHTML = '<span><i class="dot now"></i> ' + gasLive.month + " " + gasLive.year + "</span>" + (gasLive.ago == null ? "" : '<span><i class="dot past"></i> ' + money(gasLive.ago, 2) + " a year earlier</span>");
      text("gas-what", "Bureau of Labor Statistics U.S. city average for unleaded regular, " + money(gasLive.value, 2) + " in " + gasLive.month + " " + gasLive.year + ". This is the latest month on the feed, read when the page opens. It is not a full-year average. The bar runs from $0 to $5." + (gasLive.ago == null ? "" : " The tick is " + money(gasLive.ago, 2) + ", " + gasLive.month + " the year before."));
      link("gas-src", "https://data.bls.gov/timeseries/APU000074714", "BLS average price, unleaded regular");
      document.getElementById("gas-viz").setAttribute("aria-label", "In " + gasLive.month + " " + gasLive.year + " the average was " + money(gasLive.value, 2) + " a gallon.");
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
    showGas(selected.gas);
    showSpend(selected.spend);
    showCare(selected.care);
    showTrip(selected.trip);
    showDate(selected.date);
    showGpa(selected.gpa);
    showPet(selected.pet);
  }
  function refreshBls() {
    var end = new Date().getFullYear() + 1;
    return Promise.all([
      fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/APU000074714?startyear=2024&endyear=" + end).then(function (response) { return response.json(); }),
      fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/CXUTOTALEXPLB0101M?startyear=2016&endyear=" + end).then(function (response) { return response.json(); }),
      fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/CXUPETSLB0101M?startyear=2016&endyear=" + end).then(function (response) { return response.json(); }).catch(function () { return null; })
    ]).then(function (both) {
      var months = blsRows(both[0]).filter(function (row) { return row.period.charAt(0) === "M" && row.value !== "-"; });
      months.sort(function (a, b) { return (b.year + b.period).localeCompare(a.year + a.period); });
      if (months.length) {
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
      var petRead = false;
      if (both[2]) {
        blsRows(both[2]).forEach(function (row) {
          if (row.period === "A01" && row.value !== "-") {
            pets[Number(row.year)] = Math.round(Number(row.value));
            petFromBls[Number(row.year)] = true;
            petRead = true;
          }
        });
      }
      if (gasLive || spendRead || petRead) {
        var bits = [];
        if (spendRead) bits.push("Household spending");
        if (petRead) bits.push("pet spending");
        if (gasLive) bits.push("the latest gasoline month");
        var read = bits[0];
        if (bits.length === 2) read += " and " + bits[1];
        if (bits.length === 3) read = bits[0] + ", " + bits[1] + ", and " + bits[2];
        var note = document.getElementById("life-year-note");
        note.textContent = "Open Details to change a card’s year. The slider stops on years that were published. Dollars are what people paid then, not today’s prices. " + read + (bits.length === 1 ? " was" : " were") + " read from the Bureau of Labor Statistics just now" + (gasLive ? ", " + gasLive.month + " " + gasLive.year + "." : ".");
      }
      showAll();
    }).catch(function () {});
  }

  sliders.gas.addEventListener("input", function () { showGas(choose("gas")); });
  sliders.spend.addEventListener("input", function () { showSpend(choose("spend")); });
  sliders.care.addEventListener("input", function () { showCare(choose("care")); });
  sliders.trip.addEventListener("input", function () { showTrip(choose("trip")); });
  sliders.date.addEventListener("input", function () { showDate(choose("date")); });
  sliders.gpa.addEventListener("input", function () { showGpa(choose("gpa")); });
  sliders.pet.addEventListener("input", function () { showPet(choose("pet")); });
  showAll();
  refreshBls();
})();
