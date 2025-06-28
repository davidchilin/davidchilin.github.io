var viewportWidth;
var viewportHeight;
var mobile = 0;

var csvContent = [];
var scriptCsv = [];
var genreSelected = "all";
var genreSelectedAll = "all";
var eraSelected = "all";
var stage = 1;
var controller;
var genreIds = {1:"action",2:"adult",3:"adventure",4:"animation",5:"biography",6:"comedy",7:"crime",8:"documentary",9:"drama",10:"family",11:"fantasy",12:"film-noir",13:"game-show",14:"history",15:"horror",16:"music",17:"musical",18:"mystery",19:"n/a",20:"news",21:"reality-tv",22:"romance",23:"sci-fi",24:"short",25:"sport",26:"thriller",27:"war",28:"western"};
var pinned = 1;

var percentFormat = d3.format(".0%");
var commaFormat = d3.format("0,000");

function drawHistogram(){

  d3.csv("genre_mapping.csv", function(error, genreMapping) {
    d3.csv("character_list7.csv", function(error, characterData) {
      d3.csv("metadata_7.csv", function(error, metaData) {
         d3.csv("DisneyFilms3.csv", function(error, disneyFilms) {
          d3.csv("usgross_mapping.csv", function(error, usGross) {

    var mobileBubbleOffset = -20;
    var markerBubbleTopOffset = 34;
    var previewTopOffset = 59;

    if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      mobile = 1;
      stage = 2;
      mobileBubbleOffset = 20;
      markerBubbleTopOffset = -3;
      previewTopOffset = 20;
    }

    var disneyMap = d3.map(disneyFilms,function(d){
      return d.imdb_id;
    })
    ;

    var ageNest = d3.nest()
      .key(function(d){
        return d.race;
      })
      .key(function(d) {
         return d.age;
       })
      .rollup(function(leaves) {
        var total_words = d3.sum(leaves, function(d) {
          return d.words;
        })
        return total_words;
      })
      .entries(characterData);

    var ageData = [];

    var sum = 0;

    for (var race in ageNest){
      var raceSum = 0;
      var ageValues = [];
      for (var age in ageNest[race].values){
        ageNest[race].values[age].raceTag = ageNest[race].key
        if (+ageNest[race].values[age].key > 0 && +ageNest[race].values[age].key < 110 && +ageNest[race].values[age].key != ""){
          ageValues.push(ageNest[race].values[age])
          raceSum = ageNest[race].values[age].values + +raceSum;
        }
      }
      ageNest[race].values = ageValues;
      ageNest[race].total_words = raceSum;
      if(ageNest[race].key != "?"){
        ageData.push(ageNest[race]);
      }
    }

    var characterNest = d3.nest().key(function(d) {
        return d.script_id;
      })
      .entries(characterData);

    for (film in characterNest){
      var castList = characterNest[film].values;

      var offset = 0;
      castList = castList.sort(function(b, a){
        var o1 = a.race;
        var o2 = b.race;

        if (o1 < o2) return -1;
        if (o1 > o2) return 1;
        return 0;
      })
      ;
      for (castMember in castList){
        if (castMember == 0){
          castList[castMember].offset = 0
          offset = +castList[castMember].words
        }
        else{
          castList[castMember].offset = offset;
          offset = offset + +castList[castMember].words;
        }
      }
      castList = castList.sort(function(b, a){
        var o1 = +a.words;
        var o2 = +b.words;

        if (o1 > o2) return -1;
        if (o1 < o2) return 1;
        return 0;
      })
      ;
      characterNest[film].values = castList;
    }

    var characterMap = d3.map(characterNest,function(d){
        return d.key
      });

    var scriptNest = d3.nest().key(function(d) {
        return d.script_id;
      })
      .rollup(function(leaves) {
        var nonWhite_words = d3.sum(leaves, function(d) {
          if(d.race == "nw"){
            return d.words;
          }
        });
        var total_words = d3.sum(leaves, function(d) {
          return d.words;
        })

        if(mobile){
          var nonWhitePercent = Math.round(100*nonWhite_words/total_words)/100;
          if (nonWhitePercent*100 % 2 != 0){
            nonWhitePercent = Math.round(nonWhitePercent*100);
            if(nonWhitePercent % 2 != 0){
              nonWhitePercent = nonWhitePercent + 1;
            }
            nonWhitePercent = nonWhitePercent/100;
          }
          return {"nonWhite_percent":nonWhitePercent,"nonWhite_words":nonWhite_words,"total_words":total_words};
        }
        return {"nonWhite_percent":Math.round(100*nonWhite_words/total_words)/100, "nonWhite_words":nonWhite_words,"total_words":total_words};
      })
      .entries(characterData);

    var metaMap = d3.map(metaData,function(d){
      return d.script_id;
    })
    ;

    scriptNest = scriptNest.map(function(d) {
        var metaData = metaMap.get(+d.key);
        if (metaData) {
            return {
                "lines_data": metaData.lines_data,
                "gross": metaData.gross,
                "imdb_id": metaData.imdb_id,
                "title": metaData.title,
                "year": metaData.year,
                "nonWhite_percent": d.values.nonWhite_percent,
                "nonWhite_words": d.values.nonWhite_words,
                "total_words": d.values.total_words,
                "script_id": +d.key
            };
        }
        return null;
    }).filter(function(d) {
        return d != null;
    });

    var scriptMap = d3.map(scriptNest,function(d){
      return d.script_id;
    })
    ;

    var genreNest = d3.nest().key(function(d) {
        return d.imdb_id;
      })
      .entries(genreMapping);

    var genreMap = d3.map(genreNest, function(d){
      return d.key;
    });

    var values = [];
    var nonWhiteColor = "#0915ff"
    var whiteColor = "#ff0915"

    movieData = scriptNest;

    var formatCount = d3.format(".0%");
    var interpolateOne = d3.interpolate(whiteColor,"#ddd");
    var interpolateTwo = d3.interpolate("#ddd",nonWhiteColor);

    var colorScale = d3.scale.threshold().domain([0.1,0.4,0.6,0.9,1]).range([whiteColor,interpolateOne(0.5),"#ddd",interpolateTwo(0.5), nonWhiteColor]);
    var colorScaleTwo = d3.scale.threshold().domain([0.1,0.4,0.6,0.9,1]).range([whiteColor,interpolateOne(0.5),"#5D5A5A",interpolateTwo(0.5), nonWhiteColor]);

    var colorScaleContinuous = d3.scale.linear().domain([0,0.25,0.5,1]).range(["#fecb45","#f9d475","#ddd",nonWhiteColor]);
    var bucketScale = d3.scale.threshold().domain([0.2,0.4,0.6,0.8,1.1]).range(["bucket-a","bucket-b","bucket-c","bucket-d","bucket-e"]);

    movieData = movieData.sort(function(b, a){
      var o1 = a.nonWhite_percent;
      var o2 = b.nonWhite_percent;

      if (o1 > o2) return -1;
      if (o1 < o2) return 1;
      return 0;
    })
    ;

    var nonWhitePercentOrder = {};

    for (item in movieData){
      var nonWhitePercentBucket = movieData[item].nonWhite_percent;
      if(nonWhitePercentBucket in nonWhitePercentOrder){
        nonWhitePercentOrder[nonWhitePercentBucket] = nonWhitePercentOrder[nonWhitePercentBucket] + 1
      }
      else{
        nonWhitePercentOrder[nonWhitePercentBucket] = 0;
      }
      movieData[item].yOrder = nonWhitePercentOrder[nonWhitePercentBucket];
      var imdbId = movieData[item].imdb_id;
      movieData[item].movie_id = +item;
      if(genreMap.has(imdbId)){
        var genreList = genreMap.get(imdbId).values;
        var genreString = "";
        for (genre in genreList){
          var genreId = genreList[genre].genre_id;
          var genreName = genreIds[genreId];
          genreString = genreString.concat(genreName + " ");
        }
        movieData[item].genreList = genreString;
      }
      else{
        movieData[item].genreList = "";
      }
      ;
    }

    function spectrumChart(){

      var width = 900;
      var rowHeight = 12;
      var smallMobile = false;
      if(mobile){
        width = viewportWidth*.92;
        rowHeight = 14;
        if (viewportWidth < 325) { smallMobile = true; };
        if(smallMobile) { width = 306 };
      }

      var randomScale = d3.scale.linear().domain([0,1]).range([0,movieData.length]);
      var spectrumData = [];

      spectrumData = movieData;

      spectrumData = spectrumData.sort(function(b, a){
        var o1 = a.nonWhite_percent;
        var o2 = b.nonWhite_percent;

        if (o1 > o2) return -1;
        if (o1 < o2) return 1;
        return 0;
      })
      ;

      var methologyText = d3.select(".methodology-one");

      var cx = d3.scale.linear().domain([0,1]).range([0,width-2]);
      var cy = d3.scale.linear().domain([0,1]).range([-20,160]).clamp(true);

      var disneyAxis = d3.select(".star-chart")
        .append("div")
        .attr("class","star-chart-disney-axis")
        ;

      var filmElements;
      var yearScale = d3.scale.linear().domain([1980,2016]).range([-20,160]).clamp(true);

      if(mobile){

        var mobileSpectrumData = spectrumData.filter(function(d,i){
          return disneyMap.has(d.imdb_id);
        })
        ;

        filmElements = d3.select(".star-chart")
          .append("div")
          .attr("class","star-chart-data")
          .selectAll("div")
          .data(mobileSpectrumData,function(d){
            return d.imdb_id;
          })
          ;

        filmElements
          .enter()
          .append("div")
          .style("width","6px")
          .style("height","0px")
          ;

      }
      else{
        filmElements = d3.select(".star-chart")
          .append("div")
          .attr("class","star-chart-data")
          .selectAll("div")
          .data(spectrumData,function(d){
            return d.imdb_id;
          })
          ;

        filmElements
          .enter()
          .append("div")
          .attr("class","film-element")
          .style("left",function(d){
            return cx(d.nonWhite_percent) + "px";
          })
          .style("top",function(d,i){
            return d.yOrder*7 - 20 + "px";
          })
          .style("background-color",function(d){
            var color = d3.rgb(colorScaleContinuous(d.nonWhite_percent));
            return color;
          })
          .style("width","6px")
          .style("height","0px")
          .style("visibility","hidden")
          .on("mouseover",function(d,i){
            var data = d,
                order = i,
                element = this;
            elementMouseover(element,data,order);
          })
          .on("mouseout",function(d,i){
            var data = d,
                order = i,
                element = this;
            elementMouseout(element,data,order);
          })
          .on("click",function(d,i){
            var data = d,
                order = i,
                element = this;
            elementClick(element,data,order);
          })
          .on("touchstart",function(d,i){
            var data = d,
                order = i,
                element = this;
            elementTouchstart(element,data,order);
          })
          ;

      }

      var leftAssign = d3.scale.threshold().domain([.4,.6,1]).range([1,2,3]);
      var disneyScalenonWhite = d3.scale.linear().domain([0,1]).range(["#CCC",nonWhiteColor]);
      var disneyScalewhite = d3.scale.linear().domain([0,1]).range(["#CCC",whiteColor]);

      var disneyElements = filmElements
        .filter(function(d,i){
          return disneyMap.has(d.imdb_id);
        })
        .attr("id","disney-cell")
        .style("width",function(d,i){
          if(mobile){
            return width + "px";
          }
          return width/3 + 10 + "px";
        })
        .style("z-index",1000)
        .style("visibility","visible")
        ;

      var bucketElements = [1,2,3];

      for (bucket in bucketElements){

        if(mobile == 1 && bucket == 0){
          var disneyElementsData = disneyElements
            .filter(function(d,i){
              if(mobile){
                return d;
              }
              return leftAssign(d.nonWhite_percent) == bucketElements[bucket];
            })
            .style("left",function(d){
              if(mobile){
                return null;
              }
              return width*((leftAssign(d.nonWhite_percent)-1)/3) + 10 + "px";
            })
            .style("top",function(d,i){
              return i*rowHeight - 10 + "px"
          -
            .append("div")
            .attr("class","film-element-data")
            ;

          rowText = disneyElementsData.append("p")
            .attr("class","film-element-text tk-futura-pt")
            .text(function(d){
              if(d.title.length > 25){
                return d.title.slice(0,22)+"...";
              }
              if(smallMobile){
                if(d.title.length > 15){
                  return d.title.slice(0,12)+"...";
                }
              }
              return d.title;
            })
            ;

          var barContainer = disneyElementsData.append("div")
            .attr("class","film-element-column-container tk-futura-pt")
            ;

          var whiteBar = barContainer.append("div")
            .attr("class","film-white-bar film-bar")
            .style("background-color", function(d){
              return disneyScalewhite(1-d.nonWhite_percent);
            })
            .style("width", function(d){
              return 100*(1-d.nonWhite_percent) + "%";
            })
            ;

          var nonWhiteBar = barContainer.append("div")
            .attr("class","film-nonwhite-bar film-bar")
            .style("background-color", function(d){
              return disneyScalenonWhite(d.nonWhite_percent);
            })
            ;

          var statContainer = disneyElementsData.append("div")
            .attr("class","film-stat-container tk-futura-pt")
            ;

          statContainer.append("div")
            .attr("class","film-nonWhite-stat tk-futura-pt")
            .style("color",function(d){
              if (d.nonWhite_percent < 0.333333){
                return whiteColor;
              }
              else if (d.nonWhite_percent > 0.666665){
                return nonWhiteColor;
              }
            })
            .html(function(d,i){
              if (i==0 && d.nonWhite_percent < .33){
                return percentFormat(1-d.nonWhite_percent) + " white Dialogue"
              }
              else if (i==0 && d.nonWhite_percent > .6666665){
                return percentFormat(d.nonWhite_percent) + " nonwhite Dialogue"
              }
              else if (i % 5 == 0 && d.nonWhite_percent < .33){
                return percentFormat(1-d.nonWhite_percent)
              }
              else if (i % 5 == 0 && d.nonWhite_percent > .66666665){
                return percentFormat(d.nonWhite_percent)
            	//... (The rest of the file was too long to include)
