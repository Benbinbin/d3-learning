// 参考自 https://observablehq.com/@d3/splom

/**
 *
 * 将构建散点图矩阵的核心代码封装为一个函数
 *
 */
// 在 D3.js 中绘制散点图矩阵的方法参考自 https://observablehq.com/@d3/splom
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/splom
// 将绘制散点图矩阵的核心代码封装为一个函数（方便复用）
function ScatterplotMatrix(
  data,
  svg,
  {
    // 一个数组，其元素是需要进行对比的属性名（或是 accessor function 属性的访问函数，从原始数据提取出该属性的值）
    // 默认是原始数据里的所有属性 data.columns
    // 根据需要对比的属性的数量 n，构建出一个相应的 n x n 散点图矩阵
    columns = data.columns,
    // 一个数组，矩阵横向的各个散点图的 x 轴所映射的属性（或 accessor function 访问函数）
    // 默认使用 columns 参数里的属性
    x = columns,
    y = columns, // 矩阵纵向的各个散点图的 y 轴所映射的属性
    // 数据点的 Z 轴的映射函数
    // 入参是各个数据点，返回相应的分类值
    // 默认都返回 1
    // 在该实例中，返回企鹅所属的种类进行分类
    z = () => 1,
    // 以下有一些关于图形的宽高、边距尺寸相关的参数
    padding = 20, // 矩阵中邻近「单元」（即散点图）之间的间隙（单位是像素）
    // 在外四边留白，构建一个显示的安全区，一般用于在四周显示坐标轴
    marginTop = 10, // top margin, in pixels
    marginRight = 20, // right margin, in pixels
    marginBottom = 30, // bottom margin, in pixels
    marginLeft = 40, // left margin, in pixels
    width = 928, // svg 的宽度
    height = width, // svg 的高度，默认和 width 宽度一样，因为构建的是一个正方形的 n x n 散点图矩阵
    // 因为该实例中所分析对比的各个属性的数据都是连续类型的，所以每一个散点图都可以采用相同的比例尺？
    xType = d3.scaleLinear, // 每一个散点图的横坐标轴所使用的比例尺类型，默认采用线性比例尺
    yType = d3.scaleLinear, // 每一个散点图的纵坐标轴所使用的比例尺类型
    zDomain, // 一个数组，Z 轴的定义域（即数据中的所有分类，对于该实例就是所有的企鹅种类）
    // 与数据点样式相关的参数
    fillOpacity = 0.7, // 数据点的透明度
    // 颜色 schema
    // 它将用于分类比例尺中
    // 将不同的数据分类（Z 轴的定义域）映射为不同的颜色）
    colors = d3.schemeCategory10
  } = {}
) {
  /**
   *
   * 对原始数据 data 进行转换
   * 提取出相应的**轴**（X 轴、Y 轴，还可能包括其他维度，如 Z 轴，作为分类）所需的数据，以数组的形式
   * 然后在使用数据时，可以依据数据点的索引很方便地获取相应轴的值
   *
   */
  // 从原始数据 data 中提取出用于绘制矩阵中**每个散点图**的横坐标所需的数据
  // 由于该实例是 4 x 4 的散点图矩阵，所以 X 是一个具有 4 个元素的数组
  // 而 X 里面的每个元素还是数组（看上一个 cell 的演示）
  // 每个元素就是相应那一列的散点图的数据点的横坐标数据集
  // 所以在转换时需要进行两次转换 mapping，最终可以为每个散点图提取出其数据点的横坐标（对应一个属性）的值
  const X = d3.map(
    x, // 首先第一层映射是以矩阵横向的属性（数组）x 作为入参，这样 mapping 得到的是 4 个属性所对应的数据
    // 然后第二层映射是以原数据 data 作为入参，然后提取出相应的属性值
    (x) => d3.map(data, typeof x === "function" ? x : (d) => d[x])
  );
  // 从原始数据 data 中提取出用于绘制矩阵中**每个散点图**的纵坐标所需的数据
  // 该实例 Y 和 X 其实是一样的
  const Y = d3.map(y, (y) =>
    d3.map(data, typeof y === "function" ? y : (d) => d[y])
  );
  // 从原始数据 data 中提取数据点的分类依据的数据
  const Z = d3.map(data, z);

  /**
   *
   * 计算出 Z 轴的定义域，即数据中的所有分类（离散型数据）
   * 对于该实例就是所有的企鹅种类
   *
   */
  // 如果没有预设的种类 zDomain 则先将定义域设置为 Z，即先设置为所有数据点的分类依据值所构成的数据
  if (zDomain === undefined) zDomain = Z;
  // 然后再基于原来的 zDomain 值创建一个 InternSet 对象，以便去重（由于上面的 Z 中可能会有重复值，即使是指定了 zDomain 也未必能确保没有重复的分类值）
  // 这样所得的 zDomain 里的元素都是唯一的，作为 Z 轴的定义域（分类的依据）
  zDomain = new d3.InternSet(zDomain);

  // 在绘制散点图之前，这里还做了一步数据清洗
  // 使用 JavaScript 数组的原生方法 arr.filter() 筛掉不属于 zDomain 所预设的任何一类的数据点
  // 返回一个数组，其元素是一系列数字，对应于原数据集的元素的索引位置
  const I = d3.range(Z.length).filter((i) => zDomain.has(Z[i]));

  /**
   *
   * 设置矩阵「单元」（即散点图）的尺寸
   *
   */
  // 其中 X 和 Y 分别是前面数据转换得到的数组，其中 X.length 和 Y.length 长度就是矩阵在横向和纵向的维度（即在该方向上有几个属性，即散点图）
  const cellWidth =
    (width - marginLeft - marginRight - (X.length - 1) * padding) / X.length;
  const cellHeight =
    (height - marginTop - marginBottom - (Y.length - 1) * padding) / Y.length;

  /**
   *
   * 构建比例尺和坐标轴
   *
   */
  // 构建矩阵散点图的横向变量的（映射）比例尺
  // xScales 是一个数组，每一个元素对应于一列散点图的横轴（变量）比例尺
  const xScales = X.map((X) => xType(d3.extent(X), [0, cellWidth]));
  // 构建矩阵散点图的纵向变量的（映射）比例尺
  // yScales 也是一个数组，每一个元素对应于一行散点图的纵轴（变量）比例尺
  const yScales = Y.map((Y) => yType(d3.extent(Y), [cellHeight, 0]));
  // 构建分类比例尺
  // 将离散的数据（在该实例中是企鹅的不同种类）映射为不同的颜色
  const zScale = d3.scaleOrdinal(zDomain, colors);

  // 坐标轴对象
  const xAxis = d3.axisBottom().ticks(cellWidth / 50); // 横轴是一个朝下的坐标轴
  const yAxis = d3.axisLeft().ticks(cellHeight / 35); // 纵轴是一个朝左的坐标轴

  // 绘制纵向坐标轴
  svg
    .append("g")
    .selectAll("g")
    // 绑定的数据是 yScales（不同散点图的纵向属性对应不同的比例尺）
    // 一个数组，每一个元素对应于一行散点图的纵轴（变量）比例尺
    .data(yScales)
    // 为每一行散点图创建一个纵向坐标轴容器
    .join("g")
    // 通过设置 CSS 的 transform 属性将这些纵向坐标轴容器「移动」到相应的位置
    // 其中 translate() 第一个参数 `0` 表示将每一个纵坐标轴容器都定位到左侧
    // 而第二个参数 ${i * (cellHeight + padding)} 表示每一个纵坐标轴容器的高度会随着其绑定的数据的索引值而变化
    .attr("transform", (d, i) => `translate(0, ${i * (cellHeight + padding)})`)
    // 对选择集中的每个元素（纵向坐标轴容器）都调用一次函数 function 执行相应的操作
    // 该函数的入参是纵向坐标轴容器所绑定的数据（该属性相应的比例尺）
    .each(function (yScale) {
      // 在纵向坐标轴容器里用相应的比例尺绘制出坐标轴
      // 在函数内的 this 是指当前迭代的纵向坐标轴容器 <g> 元素
      return d3.select(this).call(yAxis.scale(yScale));
    })
    .call((g) => g.select(".domain").remove()) // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone() // 这里复制了一份刻度线，用以绘制散点图中纵向的网格参考线
        .attr("x2", width - marginLeft - marginRight) // 调整复制后的刻度线的终点位置（往右移动）
        .attr("stroke-opacity", 0.1)
    ); // 调小网格线的透明度

  // 绘制横向坐标轴
  svg
    .append("g")
    .selectAll("g")
    .data(xScales)
    .join("g")
    // 通过设置 CSS 的 transform 属性将这些横向坐标轴容器「移动」到相应的位置
    // 其中 translate() 第一个参数 ${i * (cellWidth + padding)} 表示每一个横坐标轴容器的水平位置会随着其绑定的数据的索引值而变化
    // 而第二个参数 ${height - marginBottom - marginTop} 表示将每一个横坐标轴容器都定位到底部
    .attr(
      "transform",
      (d, i) =>
        `translate(${i * (cellWidth + padding)}, ${height - marginBottom - marginTop
        })`
    )
    .each(function (xScale) {
      return d3.select(this).call(xAxis.scale(xScale));
    })
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("y2", -height + marginTop + marginBottom)
        .attr("stroke-opacity", 0.1)
    );

  /**
   *
   * 构建散点图矩阵的各个「单元」
   *
   */
  const cell = svg
    .append("g")
    .selectAll("g")
    // 基于行和列的维度，构建出索引值作为矩阵中各个「单元」所绑定的数据
    // 使用 d3.range() 生成一个等差数列，作为行/列的索引值
    // 使用 d3.cross() 将两个数组的元素交叉组合 [i, j] 作为二维矩阵中各元素的索引值
    // 例如 [1, 1] 可以表示第一行第一列的那个散点图
    .data(d3.cross(d3.range(X.length), d3.range(Y.length)))
    .join("g")
    .attr("fill-opacity", fillOpacity) // 设置透明度
    // 通过设置 CSS 的 transform 属性，基于每个「单元」所绑定的索引值，将它们「移动」到相应的（行和列）位置
    // 其中 translate() 第一个参数 ${i * (cellWidth + padding)} 表示该「单元」的横向位置
    // 而第二个参数 ${j * (cellHeight + padding)} 表示该「单元」的纵向位置
    .attr(
      "transform",
      ([i, j]) =>
        `translate(${i * (cellWidth + padding)}, ${j * (cellHeight + padding)})`
    );

  // 为每个「单元」设置一个边框，以便区分邻近的散点图
  cell
    .append("rect")
    .attr("fill", "none")
    .attr("stroke", "currentColor")
    .attr("width", cellWidth)
    .attr("height", cellHeight);

  // 绘制数据点
  // 对每个「单元」（散点图容器）都调用一次函数 function 执行相应的操作
  // 该函数的入参是每个「单元」（散点图容器）所绑定的数据（即「单元」所对应的索引值 [x, y]，一个二元数组）
  cell.each(function ([x, y]) {
    // 在函数内的 this 是指当前迭代的「单元」（散点图容器） <g> 元素
    // 将数据点绘制在散点图中
    d3.select(this)
      .selectAll("circle")
      // 这里在绑定数据时，再进行一次数据清洗
      // （基于 i 索引值进行迭代）筛掉在当前散点图所对应的横向属性 X[x] 或纵向属性 Y[y] 任意一个为空的数据点
      // 即 !isNaN(X[x][i]) 和 isNaN(Y[y][i]) 均需要成立
      .data(I.filter((i) => !isNaN(X[x][i]) && !isNaN(Y[y][i])))
      .join("circle")
      .attr("r", 3.5) // 设置数据点的大小（圆的半径大小）
      // 设置各个 <circle> 元素的属性 cx 和 cy 将其移动到相应的位置
      // 其中 X[x][i] 就是当前数据点的横向（原始）值，xScales[x] 就是当前散点图的比例尺（用于对数据进行映射）
      .attr("cx", (i) => xScales[x](X[x][i]))
      .attr("cy", (i) => yScales[y](Y[y][i])) // 纵向值
      .attr("fill", (i) => zScale(Z[i])); // 设置数据点的颜色，根据 Z 比例尺来设定
  });

  // 当散点图矩阵（横向维度等于纵向维度时 x===y）是一个方阵时（TODO 是否需要支持在非对称的散点图矩阵也添加标注？）
  // 在对角线上的散点图添加标注
  // 以表示（在对角线上）散点图所在的行和列所表示的属性变量
  if (x === y)
    svg
      .append("g") // 创建标注文本的容器
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .attr("font-weight", "bold")
      .selectAll("text")
      // 因为这是一个方阵，横轴和纵轴的散点图所映射的变量数量和名称都是相同的
      // 所以在绑定数据时，只需要绑定横向轴（或纵向轴）所映射的属性即可
      .data(x)
      .join("text")
      // 通过设置 CSS 的 transform 属性，将它们「移动」到相应的位置
      // 基于每个标注文本的容器所绑定的索引值，将它们定位到相应的（对角线上的）散点图里
      .attr(
        "transform",
        (d, i) =>
          `translate(${i * (cellWidth + padding)}, ${i * (cellHeight + padding)
          })`
      )
      // 为标注文本设置定位（相对于其容器）和纵向的偏移 dy，避免文字贴着散点图的边框
      .attr("x", padding / 2)
      .attr("y", padding / 2)
      .attr("dy", ".71em")
      .text((d) => d); // 设置标注内容

  return Object.assign(svg.node(), { scales: { color: zScale } });
}

/**
 *
 * 构建 svg 并获取尺寸大小等参数
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const windowWidth = document.documentElement.clientWidth; // 页面宽度
const windowHeight = document.documentElement.clientHeight; // 页面高度

let width = windowWidth;
let height = windowHeight * 0.9;

// 由于绘制的散点图矩阵是一个方阵
// 所以要将 svg 的宽高设置为一样（以较小的一个边作为基准）
if (width > height) {
  width = height;
} else {
  height = width;
}

console.log({ width, height });

const marginTop = 10; // top margin, in pixels
const marginRight = 20; // right margin, in pixels
const marginBottom = 30; // bottom margin, in pixels
const marginLeft = 40; // left margin, in pixels
// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [-marginLeft, -marginTop, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源 https://observablehq.com/@mbostock/the-wealth-health-of-nations
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/ba75c6941d7c6fd75fd65ed668e80607/raw/797e05149aad1154f28a5dfff8d59fe4d6fd5b0e/penguins.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 构建散点图矩阵
  ScatterplotMatrix(data, svg, {
    // 在原始数据中需要研究（映射）对比的属性共 4 个
    columns: [
      "culmen_length_mm", // 企鹅的嘴峰长度
      "culmen_depth_mm", // 企鹅的嘴峰深度
      "flipper_length_mm", // 企鹅的脚掌长度
      "body_mass_g" // 企鹅的体重
    ],
    z: (d) => d.species, //企鹅所属的种类通过颜色编码（映射）进行区分
    marginTop: marginTop, // top margin, in pixels
    marginRight: marginRight, // right margin, in pixels
    marginBottom: marginBottom, // bottom margin, in pixels
    marginLeft: marginLeft, // left margin, in pixels
    width: width,
    height: height
  });
});
