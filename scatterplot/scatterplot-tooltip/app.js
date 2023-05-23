/**
 *
 * 一些关于图表尺寸的参数（固定值）
 *
 */

const marginTop = 20,
  marginRight = 30,
  marginBottom = 30,
  marginLeft = 40;

// 图表元素相关参数
const r = 3,
  inset = r * 2,
  insetTop = inset,
  insetRight = inset,
  insetBottom = inset,
  insetLeft = inset;

/**
 *
 * 创建容器
 *
 */
const svg = d3.select("#container").append("svg");

/**
 *
 * 将构建散点图的核心代码封装为一个函数
 *
 */
// 在 D3.js 中绘制散点图的方法参考自 https://observablehq.com/@d3/scatterplot
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/scatterplot

function scatterPlot(
  data,
  svg,
  {
    width = 640,
    height = 400,
    xRange = [marginLeft + insetLeft, width - marginRight - insetRight],
    yRange = [height - marginBottom - insetBottom, marginTop + insetTop]
  } = {}
) {
  if (data.length <= 0) return;

  /**
   *
   * 对原始数据 data 进行转换
   *
   */
  const X = d3.map(data, (d) => d.mpg);
  const Y = d3.map(data, (d) => d.hp);
  const T = d3.map(data, (d) => d.name);
  const I = d3.range(X.length).filter((i) => !isNaN(X[i]) && !isNaN(Y[i]));

  /**
   *
   * 计算数据集的范围，作为坐标轴的定义域
   *
   */
  const xDomain = d3.extent(X);
  const yDomain = d3.extent(Y);

  /**
   *
   * 构建比例尺和坐标轴
   *
   */
  const xScale = d3.scaleLinear(xDomain, xRange);
  const yScale = d3.scaleLinear(yDomain, yRange);
  const xAxis = d3.axisBottom(xScale).ticks(width / 80);
  const yAxis = d3.axisLeft(yScale).ticks(height / 50);
  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  /**
   *
   * 绘制坐标轴
   *
   */
  const xAxisGridContainer = svg.append("g");

  xAxisGridContainer
    .attr("transform", `translate(0, ${height - marginBottom})`)
    .call(xAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("y2", marginTop + marginBottom - height)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", width)
        .attr("y", marginBottom - 4)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text("Miles per gallon →")
    );

  const yAxisGridContainer = svg.append("g");

  yAxisGridContainer
    .attr("transform", `translate(${marginLeft}, 0)`)
    .call(yAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Horsepower")
    );

  /**
   *
   * 绘制数据点和相应的标注信息
   *
   */
  const labelsContainer = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");

  labelsContainer
    .selectAll("text")
    .data(I)
    .join("text")
    .attr("dx", 7)
    .attr("dy", "0.35em")
    .attr("x", (i) => xScale(X[i]))
    .attr("y", (i) => yScale(Y[i]))
    .text((i) => T[i])
    .call((text) => text.clone(true))
    .attr("fill", "none")
    .attr("stroke", "#fff")
    .attr("stroke-width", 3);

  const pointsContainer = svg
    .append("g")
    .attr("fill", "steelblue") // 为数据点设置填充色
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5);

  pointsContainer
    .selectAll("circle")
    .data(I)
    .join("circle")
    .attr("cx", (i) => xScale(X[i]))
    .attr("cy", (i) => yScale(Y[i]))
    .attr("r", r);

  /**
   * 为数据点添加 tooltip 提示框
   */
  // 通过在 <circle> 内添加 <title> 元素实现鼠标悬浮时显示提示框
  pointsContainer
    .selectAll("circle")
    .append("title") // 在 <circle> 元素内添加一个 <title> 元素
    .text((d) => {
      // 入参数据继承自父级 <circle> 所绑定的数据
      return `mpg: ${X[d]}, hp: ${Y[d]}`; // 设置 tooltip 内容
    });

  // 同时也在标注元素 <text> 内添加 <title> 元素，也可以实现鼠标悬浮时显示提示框
  labelsContainer
    .selectAll("text")
    .append("title")
    .text((d) => {
      return `mpg: ${X[d]}, hp: ${Y[d]}`;
    });

  return {
    X,
    Y,
    xScale,
    yScale,
    xAxis,
    yAxis,
    xAxisGridContainer,
    yAxisGridContainer,
    labelsContainer,
    pointsContainer
  };
}

/**
 *
 * 数据源
 *
 */
// 数据来源 https://observablehq.com/@d3/scatterplot
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/d83bb0453ce5e3ce4316704daa312119/raw/95dd11e5a436d22de25a5c7c4496cacd31c2c826/mtcars.csv";
let dataSource = [];

/**
 *
 * 构建散点图
 *
 */
let X,
  Y,
  xScale,
  yScale,
  xAxis,
  yAxis,
  xAxisGridContainer,
  yAxisGridContainer,
  labelsContainer,
  pointsContainer;

d3.csv(dataURL, (d) => {
  return {
    name: d.name,
    mpg: +d.mpg,
    hp: +d.hp
  };
}).then((data) => {
  console.log(data);
  dataSource = data;

  ({
    X,
    Y,
    xScale,
    yScale,
    xAxis,
    yAxis,
    xAxisGridContainer,
    yAxisGridContainer,
    labelsContainer,
    pointsContainer
  } = scatterPlot(dataSource, svg, {
    width,
    height
  }));
});

/**
 *
 * 监听页面调整大小的操作，并相应地调整散点图的大小
 * 有两种思路：
 * 一种是通过图表的整体缩放来实现（主要使用 CSS 的 transform scale 属性实现），但是可能造成图表元素过大或过小的问题
 * 另一种是通过图表的局部重绘来实现，但是当页面缩放较频繁且数据量较大时可能很耗费性能，可以对图表的不同部分采用不同的重绘方案，例如对于坐标轴等元素可以完全重绘，对于数据点所对应的元素，可以改变其定位属性，移动这些元素到相应的位置，而不是完全重绘它们
 * 这里采用第二种方案
 *
 */

function setAxis(oldScale, oldAxis, rangeArr, ticksCount) {
  const newScale = oldScale.range(rangeArr);
  const newAxis = oldAxis.scale(newScale).ticks(ticksCount);

  return {
    newScale,
    newAxis
  };
}

const container = document.getElementById("container");

let width = container.clientWidth;
let height = container.clientHeight;

let timer = null;

function debounce(delay = 500) {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(function () {
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (w !== width || h !== height) {
      width = w;
      height = h;
      svg.attr("width", w).attr("height", h).attr("viewBox", [0, 0, w, h]);

      const newXAxisObj = setAxis(
        xScale,
        xAxis,
        [marginLeft + insetLeft, w - marginRight - insetRight],
        w / 80
      );

      const newXScale = newXAxisObj.newScale;
      const newXAxis = newXAxisObj.newAxis;

      xAxisGridContainer.attr("opacity", 0).selectChildren().remove();

      xAxisGridContainer
        .attr("transform", `translate(0, ${h - marginBottom})`)
        .call(newXAxis)
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g
            .selectAll(".tick line")
            .clone()
            .attr("y2", marginTop + marginBottom - h)
            .attr("stroke-opacity", 0.1)
        )
        .call((g) =>
          g
            .append("text")
            .attr("x", w)
            .attr("y", marginBottom - 4)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text("Miles per gallon →")
        )
        .transition()
        .duration(1000)
        .attr("opacity", 1);

      const newYAxisObj = setAxis(
        yScale,
        yAxis,
        [h - marginBottom - insetBottom, marginTop + insetTop],
        h / 50
      );

      const newYScale = newYAxisObj.newScale;
      const newYAxis = newYAxisObj.newAxis;

      yAxisGridContainer.attr("opacity", 0).selectChildren().remove();

      yAxisGridContainer
        .call(newYAxis)
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g
            .selectAll(".tick line")
            .clone()
            .attr("x2", w - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1)
        )
        .call((g) =>
          g
            .append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text("↑ Horsepower")
        )
        .transition()
        .duration(1000)
        .attr("opacity", 1);

      labelsContainer
        .selectAll("text")
        .transition()
        .duration(500)
        .attr("x", (i) => newXScale(X[i]))
        .attr("y", (i) => newYScale(Y[i]));

      pointsContainer
        .selectAll("circle")
        .transition()
        .duration(500)
        .attr("cx", (i) => newXScale(X[i]))
        .attr("cy", (i) => newYScale(Y[i]));
    }

    timer = null;
  }, delay);
}

function resized() {
  debounce(500);
}

function setListener() {
  window.addEventListener("resize", resized);
  return function removeListener() {
    window.removeEventListener("resize", resized);
  };
}

const removeListener = setListener();
