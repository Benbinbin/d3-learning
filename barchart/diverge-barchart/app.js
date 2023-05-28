// 参考自 https://observablehq.com/@d3/diverging-bar-chart
// 这是垂直方向的条形图 https://observablehq.com/@d3/bar-chart 的「发散型」版本
/**
 *
 * 将构建条形图的核心代码封装为一个函数（方便复用）
 *
 */
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/diverging-bar-chart
function DivergingBarChart(
  data,
  svg,
  {
    // 每个数据点的 x 值的 accessor function 访问函数
    // 从数据点的原始值中提取出用作横坐标值（横坐标值应该采用 quantitative 数值型数据，以表示具体定量的值）
    x = (d) => d, // given d in data, returns the (quantitative) x-value
    // 每个数据点的 y 值的 accessor function 访问函数
    // 从数据点的原始值中提取出用作纵坐标值（纵坐标值应该采用 ordinal 离散型数据，以表示不同类别）
    y = (d, i) => i, // given d in data, returns the (ordinal) y-value
    // 每个数据点的提示信息的 accessor function 访问函数，该函数的入参是各个数据点 d
    title,
    // 以下有一些关于图形的宽高、边距尺寸相关的参数
    // margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
    marginTop = 30, // top margin, in pixels
    marginRight = 40, // right margin, in pixels
    marginBottom = 10, // bottom margin, in pixels
    marginLeft = 40, // left margin, in pixels
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
    // 将正负值数据映射为不同的颜色
    // d3.schemePiYG[3] 是一个 Color Scheme
    // d3.schemePiYG 是一个离散型的配色方案，从一个色谱里进行采样，构成一系列有明显对比度的色值
    // 它是一个包含 12 个元素的数组，除了前 3 个元素（前 3 个元素为空，因为采样较少，无法保证颜色有足够的对比度，实用性较低？）其他元素都是嵌套数组（里面的元素都是表示颜色值的字符串）
    // 具体可以查看最后的一系列 cell
    // 可以使用 d3.schemePiYG[k] 来获取一种配色方案，k 的取值范围是 3 至 11
    // 默认采用 d3.schemePiYG[3] 作为配色方案，它返回一个数组，其中包含 3 个元素（但在该实例中，只需要两个色值，所以取数组的第一个和最后一个元素，它们的对比度最明显，便于区分两种不同的类别），每个元素都是一个色值
    // 参考 https://github.com/d3/d3-scale-chromatic/blob/v3.0.0/README.md#diverging
    colors = d3.schemePiYG[3] // [negative, …, positive] colors
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
  // 使用方法 d3.extent 返回一个由所有数据的 x 值中的最小值和最大值构成的数组 [xmin, xmax]
  if (xDomain === undefined) xDomain = d3.extent(X);

  // 如果调用函数时没有传入纵坐标轴的定义域范围 yDomain，则将其先设置为由所有数据点的 y 值构成的数组
  if (yDomain === undefined) yDomain = Y;
  // 然后基于 yDomain 值创建一个 InternSet 对象，以便去重
  // 这样所得的 yDomain 里的元素都是唯一的，作为纵坐标轴的定义域（分类的依据）
  yDomain = new d3.InternSet(yDomain);

  // 这里还做了一步数据清洗
  // 基于纵坐标轴的定义域所包含的类别
  // 使用 JavaScript 数组的原生方法 arr.filter() 筛掉不属于 yDomain 类别的任意一个的数据点
  // 其中 d3.range(X.length) 生成一个等差数列（使用 Y.length 也可以），作为索引值，便于对数据点进行迭代
  // Lookup the x-value for a given y-value.
  const I = d3.range(X.length).filter((i) => yDomain.has(Y[i]));

  // 这里构建一个 InternMap 对象（可以将它理解为一个普通的对象，但是有一些 D3.js 添加的额外属性）
  // 该对象由一系列的键值对构成，其中键是类别（即地名），值则是对应的人口（2019 年- 2010 年）差值
  // 最后返回的 InternMap 对象可以查看 👇 下一个 cell 所演示的结果
  // 之后在绘制 Y 轴时，会根据差值的正负值，来判断是否需要修改相应的坐标轴的刻度值的位置（默认在左侧，因为负值的柱子向左侧绘制的，所以需要把刻度值移到 Y 轴的右侧）
  const YX = d3.rollup(
    I,
    ([i]) => X[i],
    (i) => Y[i]
  );
  // 方法 d3.rollup(iterable, reduce, ...keys) 基于指定的属性 keys 进行分组，并对各分组进行 reduce「压缩降维」，最后返回一个 InternMap 对象
  // * 第一个参数 iterable 是可迭代对象，即数据集
  // * 第二个参数 reduce 是对分组进行压缩的函数，每个分组会依次调用该函数（入参就是包含各个分组元素的数组），返回值会作为 InternMap 对象中（各分组的）键值对中的值
  // * 余下的参数 ...keys 是一系列返回分组依据
  // 该实例是根据地名 Y[i] 进行分组
  // 然后再对每个组调用 reduce 函数 ([i]) => X[i] 进行「压缩降维」
  // 每次 reduce 函数时，传入的都是一个数组（由该分组的所有元素组成，即该分组的索引值构成的一个数组），而本实例中，每个分组就只有一个元素（一个地名归为一组），所以这里使用 [i] 直接解构出相应的索引值，并通过 X[i] 来获取该地方对应的人口（2019 年- 2010 年）差值
  // 因此最终每个分组「压缩降维」得到的数据是该地方对应的人口（2019 年- 2010 年）差值

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
  // 横轴是一个（刻度值）朝上的坐标轴
  // 并设置坐标轴的刻度数量和刻度值格式
  const xAxis = d3.axisTop(xScale).ticks(width / 80, xFormat);

  // 纵坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  // 并设置间隔占据（柱子）区间的比例
  const yScale = d3.scaleBand(yDomain, yRange).padding(yPadding);
  // 纵轴是一个（刻度值）朝左的坐标轴
  // 而且将坐标轴的刻度 tickSize 长度设置为 0（即取消坐标轴的刻度线），并将刻度值与轴线的距离设置为 6px
  const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(6);

  // 构建一个数值格式器（根据设置来自动确定数据的精度，更适用于阅读）
  // 用于对柱子的标注信息或提示信息进行格式化
  const format = xScale.tickFormat(100, xFormat);

  /**
   *
   * 柱子的提示信息的 accessor function 访问函数
   * 统一为**基于索引**获取数据点的提示信息
   * 提示信息是指当鼠标 hover 在柱子上时会显示相应的信息
   *
   */
  // 如果调用函数时没有设定提示信息的 accessor function 访问函数
  // 则构建一个 accessor function 访问函数
  // 它接受一个表示数据点的索引值，并从 X 中分别提取出柱子相应的频率组成提示信息
  if (title === undefined) {
    // 默认的提示信息由该柱子所属的类别 Y[i] 及其相应的值 format(X[i]) 组成（2019 年- 2010 年人口差值）
    title = (i) => `${Y[i]}\n${format(X[i])}`;
  } else if (title !== null) {
    // 如果调用函数时由设定提示信息的 accessor function 访问函数
    // 为了便于后面统一基于索引值进行调用，需要进行转换
    // 将 title 变成**基于索引**获取数据点的提示信息的 accessor function 访问函数
    const O = d3.map(data, (d) => d);
    const T = title; // 将原始的提示信息访问函数赋给 T 变量
    title = (i) => T(O[i], i, data); // title 变成基于索引的提示信息 accessor function 访问函数
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
        // 将该文本移动到横坐标轴的零点位置（不一定是最左侧）
        .attr("x", xScale(0))
        .attr("y", -22)
        .attr("fill", "currentColor")
        .attr("text-anchor", "center") // 设置文本的对齐方式为 center，即文本的中间对齐到横坐标轴的零点位置
        .text(xLabel)
    ); // 文本内容

  // 绘制纵坐标轴
  svg
    .append("g")
    .attr("transform", `translate(${xScale(0)},0)`) // 将纵坐标轴容器定位到横坐标轴的零点位置
    .call(yAxis)
    .call(
      (g) =>
        // 选择所有的刻度值
        g
          .selectAll(".tick text")
          .filter((y) => YX.get(y) < 0) // 筛选出所对应的柱子的值为负值的刻度值
          // 刻度值默认在纵轴的左侧，将这些刻度值调整到纵轴的右侧
          .attr("text-anchor", "start") // 将文本的对齐方式改变为 start
          .attr("x", 6) // 并设置一点水平向右的偏移（6px）
    );

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  const bar = svg
    .append("g")
    // 使用 <rect> 元素来绘制柱子
    // 通过设置矩形的左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    .selectAll("rect")
    .data(I) // 绑定的数据是表示数据点的索引值（数组），以下会通过索引值来获取各柱子相应的数据
    .join("rect")
    .attr("fill", (i) => colors[X[i] > 0 ? colors.length - 1 : 0]) // 基于柱子所对应数据的正负值来采用不同的填充色
    // 因为绘制的是水平方向的条形图，而且柱子可能是向左或向右延伸的，所以矩形的左上角的横坐标值不一定是 xScale(0)
    // 对于表示负值的柱子，矩形的左上角的横坐标值对应于 xScale(X[i])
    // 对于表示正值的柱子，矩形的左上角的横坐标值对应于 xScale(0)
    // 最后通过 Math.min() 取两者中的最小值即为左上角的点的横坐标值
    .attr("x", (i) => Math.min(xScale(0), xScale(X[i])))
    // 矩形左上角的纵坐标值
    .attr("y", (i) => yScale(Y[i]))
    // 矩形的宽度
    // 即水平柱子的长度，通过比例尺映射后，柱子的宽度是 Math.abs(xScale(X[i]) - xScale(0)) 的差值
    // 因为柱子可能是向左或向右延伸，所以最值 xScale(X[i]) 可能比零点值 xScale(0) 更大，也可以会更小
    // 所以最后要通过方法 Math.abs() 取绝对值才是水平柱子的长度
    .attr("width", (i) => Math.abs(xScale(X[i]) - xScale(0)))
    // 矩形的高度
    // 即柱子的大小，通过纵轴的比例尺的方法 yScale.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("height", yScale.bandwidth());

  // 设置每个柱子的提示信息
  // 在每个柱子（容器）内分别添加一个 <title> 元素
  // 当鼠标 hover 在柱子上时会显示相应的信息
  if (title) bar.append("title").text(title);

  /**
   *
   * 设置每个柱子的标注信息
   * 将标注信息显示在柱子旁边
   *
   */
  svg
    .append("g")
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll("text")
    .data(I) // 绑定的数据是表示数据点的索引值（数组），以下会通过索引值来获取各柱子相应标注信息
    .join("text")
    // 基于该标注信息所对应数据的正负值（柱子向右或向左延伸），设置文本的对齐方式
    .attr("text-anchor", (i) => (X[i] < 0 ? "end" : "start"))
    // 将文本移动到相应的柱子上
    // 水平定位到柱子的「顶部」，并根据柱子的延伸方向，将文本进行相应的（向左或向右的）偏移，留有一些间距
    // 其中 Math.sign() 函数返回 +1、-1 或 0，分别入参的值是一个正数、负数或零
    // 例如当 X[i] 是负值（即柱子是向左的），则  Math.sign(X[i] - 0) 就返回 -1
    // 所以标注信息的文本水平偏移 -4px（即向左偏移）
    .attr("x", (i) => xScale(X[i]) + Math.sign(X[i] - 0) * 4)
    .attr("y", (i) => yScale(Y[i]) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((i) => format(X[i])); // 文本内容，使用数值格式器 format 进行格式化，便于阅读

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
const margin = { top: 30, right: 200, bottom: 30, left: 70 };

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
  "https://gist.githubusercontent.com/Benbinbin/0b2f44afece4551b579d5bd952eb6671/raw/05838ff20ea1caa46056424650d0a14a857af8fa/state-population-2010-2019.tsv";

d3.tsv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 构建散点图矩阵
  DivergingBarChart(data, svg, {
    x: (d) => d[2019] - d[2010],
    y: (d) => d.State,
    // 调用函数时，传入纵轴的定义域 yDomain 手动设置分组类别
    // 并且类别是按照该地区的 2019 年与 2010 年人口的差值大小进行降序排列的
    // 使用方法 d3.groupSort(iterable, accessor, key) 对可迭代对象（如数组）iterable 进行归类分组，其中 key 指定分组的依据
    // 该方法默认按照 accessor 访问器的返回值升序排列，即较小的值（负值）排在前面
    yDomain: d3.groupSort(
      data,
      ([d]) => d[2019] - d[2010],
      (d) => d.State
    ),
    // 格式化横坐标轴的刻度值，将数值取整，并为千位添加逗号
    xFormat: "+,d",
    xLabel: "← decrease · Change in population · increase →",
    marginTop: margin.top,
    marginRight: margin.right,
    marginBottom: margin.bottom,
    marginLeft: margin.left,
    width: width,
    height: height,
    colors: d3.schemeRdBu[3] // 这里指定了正负值的柱子的配色方案
  });
});
