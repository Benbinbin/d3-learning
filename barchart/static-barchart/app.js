// 参考自 https://observablehq.com/@d3/bar-chart

/**
 *
 * 将构建条形图的核心代码封装为一个函数（方便复用）
 *
 */
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/bar-chart
function BarChart(
  data,
  svg,
  {
    // 每个数据点的 x 值的 accessor function 访问函数
    // 从数据点的原始值中提取出用作横坐标值（横坐标值应该采用 ordinal 离散型数据，以表示不同类别）
    // 默认采用数据点的**序数**作为横坐标值
    x = (d, i) => i,
    // 每个数据点的 y 值的 accessor function 访问函数
    // 从数据点的原始值中提取出用作纵坐标值（纵坐标值应该采用 quantitative 数值型数据，以表示具体定量的值）
    y = (d) => d,
    // 每个数据点的标注信息的 accessor function 访问函数，该函数的入参是各个数据点 d
    title,
    // 以下有一些关于图形的宽高、边距尺寸相关的参数
    // 在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
    marginTop = 20, // the top margin, in pixels
    marginRight = 0, // the right margin, in pixels
    marginBottom = 30, // the bottom margin, in pixels
    marginLeft = 40, // the left margin, in pixels
    width = 640, // svg 的宽度
    height = 400, // svg 的高度
    // 横坐标轴的定义域范围，是一个数组，其中的每一个元素都是一个不同的类别
    // 一般是基于原始数据（去重）提取而成的
    // 也可以在这里手动直接设置希望显示的类别，然后在函数内部有相关的代码对数据进行筛选
    xDomain,
    // 横坐标轴的值域（可视化属性，这里是长度）范围 [left, right] 从左至右，和我们日常使用一致
    xRange = [marginLeft, width - marginRight], // [left, right]
    yType = d3.scaleLinear, // 纵轴所采用的比例尺，对于数值型数据，默认采用线性比例尺
    yDomain, // 纵坐标轴的定义域范围 [ymin, ymax]
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    yRange = [height - marginBottom, marginTop], // [bottom, top]
    // 设置条形图中邻近柱子之间的间隔大小
    // 该参数是设置横轴值域的内外间隔系数，该值需要小于（或等于）1，表示留空的间隔占据（柱子）区间的比例
    xPadding = 0.1,
    yFormat, // 格式化数字的说明符 specifier 用于格式化纵坐标轴的刻度值
    yLabel, // 为纵坐标轴添加额外文本（一般是刻度值的单位等信息）
    color = "currentColor" // 柱子的颜色
  } = {}
) {
  /**
   *
   * 处理数据
   *
   */
  // 通过 d3.map() 迭代函数，使用相应的 accessor function 访问函数从原始数据 data 中获取相应的值
  const X = d3.map(data, x);
  const Y = d3.map(data, y);

  /**
   *
   * 构建比例尺和坐标轴
   *
   */
  // 计算坐标轴的定义域范围
  // 如果调用函数时没有传入横坐标轴的定义域范围 xDomain，则将其先设置为由所有数据点的 x 值构成的数组
  if (xDomain === undefined) xDomain = X;
  // 然后基于 xDomain 值创建一个 InternSet 对象，以便去重
  // 这样所得的 xDomain 里的元素都是唯一的，作为横坐标轴的定义域（分类的依据）
  xDomain = new d3.InternSet(xDomain);
  // 纵坐标轴的定义域 [ymin, ymax] 其中最大值 ymax 使用方法 d3.max(Y) 从所有数据点的 y 值获取
  if (yDomain === undefined) yDomain = [0, d3.max(Y)];

  // 这里还做了一步数据清洗
  // 基于横坐标轴的定义域所包含的类别
  // 使用 JavaScript 数组的原生方法 arr.filter() 筛掉不属于 xDomain 类别的任意一个的数据点
  // 其中 d3.range(X.length) 生成一个等差数列，作为索引值，便于对数据点进行迭代
  const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

  // 横坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  // 并设置间隔占据（柱子）区间的比例
  const xScale = d3.scaleBand(xDomain, xRange).padding(xPadding);
  // 横轴是一个朝下的坐标轴
  // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);

  // 纵坐标轴的数据是连续型的数值，默认使用 d3.scaleLinear 构建一个线性比例尺
  const yScale = yType(yDomain, yRange);
  // 纵轴是一个朝左的坐标轴
  // 并设置坐标轴的刻度数量和刻度值格式
  const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);

  /**
   *
   * 设置柱子的标注信息
   * 当鼠标 hover 在柱子上时会显示相应的信息
   *
   */
  // 如果调用函数时没有设定标注信息的 accessor function 访问函数
  // 则构建一个 accessor function 访问函数
  // 它接受一个表示数据点的索引值，并从 X 和 Y 中分别提取出柱子所属的类别和相应的频率组成标注信息
  if (title === undefined) {
    // 除了坐标轴对象（前面的 yAxis）可以设置刻度值格式外
    // 比例尺本身也有与刻度值格式相关的方法 .tickFormat
    // 但是这个方法返回值的不是比例尺（一般都是返回调用对象，即比例尺本身，便于进行链式调用）而是一个格式器
    // 如果是连续型比例尺调用方法 continuous.tickFormat([count[, specifier]]) 则返回一个**数值格式器**
    // 具体可以参考 https://github.com/d3/d3-scale#continuous_tickFormat
    // 数值格式器设计初衷是对传入的值进行处理，转换得到一个值更适用于作为刻度值？
    // 所以主要的作用是对传入的值进行修约（改变精度，让刻度值更易读），还可以进行格式转换（如变成百分比）
    // 数值格式器会根据比例尺的定义域（该实例的定义域是 [0, 0.12702]）自动决定刻度值的精度
    // 第一个参数是设置预期的刻度线数量，刻度线越多，则刻度值的精度相对就会越高
    // 第二个参数是设置刻度值的格式
    const formatValue = yScale.tickFormat(100, yFormat);
    // 标注信息有该柱子所属的类别 X[i] 及其相应的频率 formatValue(Y[i]) 组成
    title = (i) => `${X[i]}\n${formatValue(Y[i])}`;
  } else {
    // 如果调用函数时由设定标注信息的 accessor function 访问函数
    // 为了便于后面统一基于索引值进行调用，需要进行转换
    // 将 title 变成**基于索引**获取数据点的标注信息的 accessor function 访问函数
    const O = d3.map(data, (d) => d); // 实际就是原始数据
    const T = title; // 将原始的标注信息访问函数赋给 T 变量

    // 原始的访问函数 T 就是接收数据点的原始值 O[i] 作为参数，并返回相应的标注信息
    title = (i) => T(O[i], i, data); // title 变成基于索引的标注信息 accessor function 访问函数
  }

  /**
   *
   * 绘制条形图的容器（边框和坐标轴）
   *
   */
  // 绘制纵坐标轴
  svg
    .append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来
    .call(yAxis)
    .call((g) => g.select(".domain").remove()) // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone() // 这里复制了一份刻度线，用以绘制横向的参考线
        .attr("x2", width - marginLeft - marginRight) // 调整复制后的刻度线的终点位置（往右移动）
        .attr("stroke-opacity", 0.1)
    ) // 调小网格线的透明度
    .call((g) =>
      g
        .append("text") // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
        // 将该文本移动到容器的左上角
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start") // 设置文本的对齐方式
        .text(yLabel)
    ); // 文本内容

  // 绘制纵坐标轴
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`) // 将横坐标轴容器定位到底部
    .call(xAxis);

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  const bar = svg
    .append("g")
    .attr("fill", color)
    // 使用 <rect> 元素来绘制柱子
    // 通过设置矩形的左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    .selectAll("rect")
    .data(I) // 绑定的数据是表示数据点的索引值（数组），以下会通过索引值来获取各柱子相应的数据
    .join("rect")
    .attr("x", (i) => xScale(X[i])) // 通过索引值来读取柱子的左上角横坐标值
    .attr("y", (i) => yScale(Y[i])) // 通过索引值来读取柱子的左上角纵坐标值
    // 柱子的高度
    // ⚠️ 应该特别留意因为在 svg 的坐标体系中向下和向右是正方向
    //  所以通过比例尺映射后，在 svg 坐标体系里，柱子底部的 y 值（即 yScale(0)）是大于柱子顶部的 y 值（即 yScale(Y[i])），所以柱子的高度是 yScale(0) - yScale(Y[i]) 的差值
    .attr("height", (i) => yScale(0) - yScale(Y[i]))
    // 柱子的宽度
    // 通过横轴的比例尺的方法 xScale.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    // 这里不需要通过索引值来获取每个柱子的宽度，因为每一个柱子的宽度都相同
    .attr("width", xScale.bandwidth());

  // 设置每个柱子的标注信息
  if (title)
    bar
      .append("title")
      // 这里通过标注信息的 accessor function 访问函数
      // title 访问函数的入参是索引值（每个 bar 在上一步都绑定了数据，即相应的索引值）
      .text(title);

  return svg.node();
}

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
const margin = { top: 20, right: 20, bottom: 30, left: 20 };

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/bar-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/04f66f9f466d8293c798cefdd8a36021/raw/686830fb1232d7ea7ca8014b3bf959ab928e173a/alphabet.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 构建散点图矩阵
  BarChart(data, svg, {
    x: (d) => d.letter,
    y: (d) => d.frequency,
    // 调用函数时，传入横轴的定义域 xDomain 手动设置分组类别
    // 并且类别是按照其相应的频次进行降序排列的
    // 使用方法 d3.groupSort(iterable, accessor, key) 对可迭代对象（如数组）iterable 进行归类分组，其中 key 指定分组的依据
    // 最后返回（排序好的）类别数组，最终的输出值可以查看 👇 下一个 cell 所演示的结果
    // 由于该方法默认按照 accessor 访问器的返回值升序排列，这里是希望降序排列，仅仅需要在返回值前面添加负号 - 即可
    xDomain: d3.groupSort(
      data,
      ([d]) => -d.frequency,
      (d) => d.letter
    ),
    yFormat: "%", // 纵轴的刻度值采用百分比表示
    yLabel: "↑ Frequency",
    marginTop: margin.top, // the top margin, in pixels
    marginRight: margin.right, // the right margin, in pixels
    marginBottom: margin.bottom, // the bottom margin, in pixels
    marginLeft: margin.left, // t
    width: width,
    height: height,
    color: "steelblue"
  });
});