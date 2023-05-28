// 参考自 https://observablehq.com/@d3/horizontal-bar-chart
// 这是垂直方向的条形图 https://observablehq.com/@d3/bar-chart 的「水平方向」版本
// 💡 其实根据垂直方向的条形图，可以很方便地制作水平方向的条形图，只需要将坐标轴相互调换（并对于相关的元素和方法进行调整）即可
/**
 *
 * 将构建条形图的核心代码封装为一个函数（方便复用）
 *
 */
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/horizontal-bar-chart
function HorizontalBarChart(
  data,
  svg,
  {
    // 每个数据点的 x 值的 accessor function 访问函数
    // 从数据点的原始值中提取出用作横坐标值（横坐标值应该采用 quantitative 数值型数据，以表示具体定量的值）
    x = (d) => d,
    // 每个数据点的 y 值的 accessor function 访问函数
    // 从数据点的原始值中提取出用作纵坐标值（纵坐标值应该采用 ordinal 离散型数据，以表示不同类别）
    y = (d, i) => i,
    // 每个数据点的标注信息的 accessor function 访问函数，该函数的入参是各个数据点 d
    title, // 为每个柱子标注的信息
    titleColor = "white", // 标注信息在柱子上时，文字的颜色
    titleAltColor = "currentColor", // 标注信息在条形图的背景上时，文字的颜色
    // 以下有一些关于图形的宽高、边距尺寸相关的参数
    // margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
    marginTop = 30, // the top margin, in pixels
    marginRight = 0, // the right margin, in pixels
    marginBottom = 10, // the bottom margin, in pixels
    marginLeft = 30, // the left margin, in pixels
    width = 640, // svg 的宽度
    height, // svg 的高度
    xType = d3.scaleLinear, // 横轴所采用的比例尺，对于数值型数据，默认采用线性比例尺
    xDomain, // 横坐标轴的定义域范围，即数据的范围 [xmin, xmax]
    // 横坐标轴的值域（可视化属性，这里是长度）范围 [left, right] 从左至右，和我们日常使用一致
    xRange = [marginLeft, width - marginRight],
    xFormat, // 格式化数字的说明符 specifier 用于格式化横坐标轴的刻度值
    xLabel, // 为横坐标轴添加额外文本（一般是刻度值的单位等信息）
    // 纵坐标轴的定义域范围，是一个数组，其中的每一个元素都是一个不同的类别
    // 一般是基于原始数据（去重）提取而成的
    // 也可以在这里手动直接设置希望显示的类别，然后在函数内部有相关的代码对数据进行筛选
    yDomain, // an array of (ordinal) y-values
    // 纵坐标轴的值域
    // 如果纵坐标是映射定量数值时，应该特别留意 svg 的坐标体系的正方向（向右，向下）
    // 但是因为当前绘制的是横向条形图，纵轴映射的是分类数据
    // 💡 所以这里的值域**不一定需要**采用从下往上与定义域进行映射 [bottom, top]
    // 这里默认就采用 [top, bottom]
    yRange, // [top, bottom]
    yPadding = 0.1, // 设置条形图中邻近柱子之间的间隔大小
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
  // 横坐标轴的定义域 [xmin, xmax] 其中最大值 xmax 使用方法 d3.max(X) 从所有数据点的 X 值获取
  if (xDomain === undefined) xDomain = [0, d3.max(X)];

  // 如果调用函数时没有传入纵坐标轴的定义域范围 yDomain，则将其先设置为由所有数据点的 y 值构成的数组
  if (yDomain === undefined) yDomain = Y;
  // 然后基于 yDomain 值创建一个 InternSet 对象，以便去重
  // 这样所得的 yDomain 里的元素都是唯一的，作为纵坐标轴的定义域（分类的依据）
  yDomain = new d3.InternSet(yDomain);

  // 这里还做了一步数据清洗
  // 基于纵坐标轴的定义域所包含的类别
  // 使用 JavaScript 数组的原生方法 arr.filter() 筛掉不属于 yDomain 类别的任意一个的数据点
  // 其中 d3.range(X.length) 生成一个等差数列（使用 Y.length 也可以），作为索引值，便于对数据点进行迭代
  const I = d3.range(X.length).filter((i) => yDomain.has(Y[i]));

  // 如果调用函数时没有设置高度，则基于柱子的数量和上下的留白宽度算出默认的 svg 的高度
  // 其中 yDomain.size 得到 InternSet 对象中包含的元素个数（即类别数量），然后这里假设每个柱子宽度是 25px
  // 其中加上 yPadding 是为了考虑柱子间存在的间隔
  // 通过 Math.ceil() 方法进行向上修约（让 svg 留足空间来绘制条形图）
  if (height === undefined)
    height =
      Math.ceil((yDomain.size + yPadding) * 25) + marginTop + marginBottom;
  // 然后计算出纵坐标轴的值域 [top, bottom]
  if (yRange === undefined) yRange = [marginTop, height - marginBottom];

  // 横坐标轴的数据是连续型的数值，默认使用 d3.scaleLinear 构建一个线性比例尺
  const xScale = xType(xDomain, xRange);
  // 横轴是一个朝上的坐标轴
  // 并设置坐标轴的刻度数量和刻度值格式
  const xAxis = d3.axisTop(xScale).ticks(width / 80, xFormat);

  // 纵坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  // 并设置间隔占据（柱子）区间的比例
  const yScale = d3.scaleBand(yDomain, yRange).padding(yPadding);
  // 纵轴是一个朝左的坐标轴
  // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
  const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);

  /**
   *
   * 柱子的标注信息的 accessor function 访问函数
   * 统一为**基于索引**获取数据点的标注信息
   * 根据柱子的长短，决定标注文本的不同位置和颜色
   * 如果柱子较长，将标注信息置于柱子上，文本颜色为白色
   * 如果柱子较短，将标注信息置于柱子旁边（在条形图的背景上），文本的颜色为黑色
   *
   */
  // 如果调用函数时没有设定标注信息的 accessor function 访问函数
  // 则构建一个 accessor function 访问函数
  // 它接受一个表示数据点的索引值，并从 X 中分别提取出柱子相应的频率组成标注信息
  if (title === undefined) {
    // 构建一个数值格式器（根据设置来自动确定数据的精度，更适用于阅读）
    const formatValue = xScale.tickFormat(100, xFormat);
    // 标注信息由该柱子相应的频率 formatValue(Y[i]) 组成
    title = (i) => `${formatValue(X[i])}`;
  } else {
    // 如果调用函数时由设定标注信息的 accessor function 访问函数
    // 为了便于后面统一基于索引值进行调用，需要进行转换
    // 将 title 变成**基于索引**获取数据点的标注信息的 accessor function 访问函数
    const O = d3.map(data, (d) => d);
    const T = title; // 将原始的标注信息访问函数赋给 T 变量
    title = (i) => T(O[i], i, data); // title 变成基于索引的标注信息 accessor function 访问函数
  }

  /**
   *
   * 绘制条形图的容器（边框和坐标轴）
   *
   */
  // 绘制横坐标轴
  svg
    .append("g")
    // 通过设置 CSS 的 transform 属性将横向坐标轴容器「移动」到顶部
    .attr("transform", `translate(0,${marginTop})`)
    .call(xAxis) // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来
    .call((g) => g.select(".domain").remove()) // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone() // 这里复制了一份刻度线，用以绘制竖向的参考线
        .attr("y2", height - marginTop - marginBottom) // 调整复制后的刻度线的终点位置（往下移动）
        .attr("stroke-opacity", 0.1)
    ) // 调小网格线的透明度
    .call((g) =>
      g
        .append("text") // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
        // 将该文本移动到容器的右侧
        .attr("x", width - marginRight)
        .attr("y", -22)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end") // 设置文本的对齐方式
        .text(xLabel)
    ); // 文本内容

  // 绘制纵坐标轴
  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`) // 将纵坐标轴容器定位到左侧
    .call(yAxis);

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  svg
    .append("g")
    .attr("fill", color)
    // 使用 <rect> 元素来绘制柱子
    // 通过设置矩形的左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    .selectAll("rect")
    .data(I) // 绑定的数据是表示数据点的索引值（数组），以下会通过索引值来获取各柱子相应的数据
    .join("rect")
    // 因为绘制的是水平方向的条形图
    // 所以每个柱子都是对齐到 y 轴的，即矩形的左上角横坐标值都是 xScale(0)
    .attr("x", xScale(0))
    // 通过索引值来读取矩形的左上角纵坐标值
    .attr("y", (i) => yScale(Y[i]))
    // 矩形的宽度
    // 即水平柱子的长度，通过比例尺映射后，柱子的宽度是 xScale(X[i]) - xScale(0)) 的差值
    .attr("width", (i) => xScale(X[i]) - xScale(0))
    // 矩形的高度
    // 即柱子的大小，通过纵轴的比例尺的方法 yScale.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("height", yScale.bandwidth());

  // 设置每个柱子的标注信息
  // 之前在垂直条形图中，只有当鼠标 hover 在柱子上才显示的标注信息，
  // 💡 而现在由于条形图是横向的，与文字阅读方向相同，所以现在有足够的位置可以直接显示在相应的柱子上
  svg
    .append("g")
    // 先默认标注信息都在柱子上，设置文字的颜色
    .attr("fill", titleColor)
    // 因为默认文本在柱子的最右侧，所以对齐方式设置为 end
    // 即文本的 (x, y) 定位坐标是其末尾，文字向左展开
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll("text")
    .data(I) // 绑定的数据是表示数据点的索引值（数组），以下会通过索引值来获取各柱子相应标注信息
    .join("text")
    // 将文本移动到相应的柱子上
    .attr("x", (i) => xScale(X[i])) // 文本的横向坐标，移到柱子的最右侧
    .attr("y", (i) => yScale(Y[i]) + yScale.bandwidth() / 2) // 文本的纵向坐标
    .attr("dy", "0.35em")
    .attr("dx", -4)
    .text(title)
    // 最后再基于柱子的长度对文本的定位和颜色进行调整
    .call((text) =>
      // 筛选出较短的柱子所对应的文本
      // 当矩形的长度 xScale(X[i]) - xScale(0) 小于 20 时就是较短的柱子
      text
        .filter((i) => xScale(X[i]) - xScale(0) < 20) // short bars
        .attr("dx", +4) // 将文本稍微向右移动，这样文本就位于条形图的白色背景上（而不是彩色的柱子上）
        .attr("fill", titleAltColor) // 所以需要将白色的文字改成黑色的文字
        // 而且改变文字的对齐方式为 start，即文本的 (x, y) 定位坐标是其开头，文字向右展开
        .attr("text-anchor", "start")
    );

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
const margin = { top: 30, right: 30, bottom: 30, left: 30 };

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [-margin.left, -margin.top, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/horizontal-bar-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/04f66f9f466d8293c798cefdd8a36021/raw/686830fb1232d7ea7ca8014b3bf959ab928e173a/alphabet.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 构建散点图矩阵
  HorizontalBarChart(data, svg, {
    x: (d) => d.frequency,
    y: (d) => d.letter,
    // 调用函数时，传入纵轴的定义域 yDomain 手动设置分组类别
    // 并且类别是按照其相应的频次进行降序排列的
    // 使用方法 d3.groupSort(iterable, accessor, key) 对可迭代对象（如数组）iterable 进行归类分组，其中 key 指定分组的依据
    // 最后返回（排序好的）类别数组，最终的输出值可以查看 👇 下一个 cell 所演示的结果
    // 由于该方法默认按照 accessor 访问器的返回值升序排列，这里是希望降序排列，仅仅需要在返回值前面添加负号 - 即可
    yDomain: d3.groupSort(
      data,
      ([d]) => -d.frequency,
      (d) => d.letter
    ),
    xFormat: "%", // 横轴的刻度值采用百分比表示
    xLabel: "Frequency →",
    marginTop: margin.top, // the top margin, in pixels
    marginRight: margin.right, // the right margin, in pixels
    marginBottom: margin.bottom, // the bottom margin, in pixels
    marginLeft: margin.left, // t
    width: width,
    height: height,
    color: "steelblue"
  });
});
