/**
 *
 * 将构建散点图和路径展开动画的核心代码封装为一个函数
 *
 */
// 在 D3.js 中绘制散点图的方法参考自 https://observablehq.com/@d3/connected-scatterplot
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/connected-scatterplot
function ConnectedScatterplot(
  data,
  svg,
  {
    x = ([x]) => x, // （映射函数）从数据点 d 中提取横坐标值 x
    y = ([, y]) => y, // （映射函数）从数据点 d 中提取纵坐标值 y
    r = 3, // 数据点大小（固定值，单位是像素）默认为 3px
    title, // （映射函数）从数据点 d 中提取 label 标注信息
    orient = () => "top", // （映射函数）从数据点 d 中提取（标注信息的）方位（在数据点的顶部、右侧、底部或左侧）
    defined, // （映射函数）判断数据点是否满足定义（例如数据类型为数值，可作为一个简单的数据清洗过程）
    curve = d3.curveCatmullRom, // 曲线插值生成器（配合线段生成器使用，作为方法 d3.line.curve() 的入参），用于定义两个离散点之间的连线如何生成，默认采用 d3.curveCatmullRom 方式
    // 不同曲线插值生成器的效果可以查看官方文档 https://github.com/d3/d3-shape#curves
    width = 640, // 外围的（svg 整体）宽度
    height = 400, // 外围的（svg 整体）高度
    // 以下有一些关于图形的宽高、边距尺寸相关的参数
    // 在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
    marginTop = 20, // top margin, in pixels
    marginRight = 20, // right margin, in pixels
    marginBottom = 30, // bottom margin, in pixels
    marginLeft = 30, // left margin, in pixels
    // 在内四周留白，构建一个显示数据点的安全区，避免哪些最小（大）值的数据点和坐标轴重叠
    inset = r * 2, // inset the default range, in pixels
    insetTop = inset, // inset the default y-range
    insetRight = inset, // inset the default x-range
    insetBottom = inset, // inset the default y-range
    insetLeft = inset, // inset the default x-range
    // 横坐标轴
    xType = d3.scaleLinear, // 横坐标轴的比例尺类型，默认为线性比例尺
    xDomain, // 横坐标轴的定义域（数据点的范围），以数组表示 [xmin, xmax]
    // 横坐标轴的值域（页面宽度的范围），以数组表示 [left, right]
    xRange = [marginLeft + insetLeft, width - marginRight - insetRight],
    xFormat, // 设置横坐标刻度值格式
    xLabel, // 为横坐标轴添加额外信息（一般是刻度值的单位等信息）
    // 纵坐标轴
    yType = d3.scaleLinear, // type of y-scale
    yDomain, // [ymin, ymax]
    yRange = [height - marginBottom - insetBottom, marginTop + insetTop], // [bottom, top]
    yFormat, // a format specifier string for the y-axis
    yLabel, // a label for the y-axis
    fill = "white", // 数据点的填充颜色
    stroke = "currentColor", // 连线和数据点的描边颜色
    strokeWidth = 2, // 连线和数据点的描边的宽度
    strokeLinecap = "round", // 连线两端的形状
    strokeLinejoin = "round", // 连线转角处的形状
    halo = "#fff", // 数据点的标注信息的文字描边颜色
    haloWidth = 6, // 数据点的标注信息的文字描边宽度
    duration = 0 // 连线动效持续时间（默认值为 0 即无连接动效）
  } = {}
) {
  /**
   *
   * 处理数据
   *
   */
  // 通过 d3.map() 迭代函数，使用相应的映射函数从原始数据 data 中获取相应的值
  const X = d3.map(data, x); // 从原始数据获取数据点的横坐标值
  const Y = d3.map(data, y); // 从原始数据获取数据点的纵坐标值
  const T = title == null ? null : d3.map(data, title); // 从原始数据获取数据点的标注信息
  const O = d3.map(data, orient); // 从原始数据获取数据点标注信息的方位
  const I = d3.range(X.length); // 基于数据点的数量，使用 d3.range() 构建一个等差数列，作为索引列表

  // 判断数据点是否满足定义（返回一个由布尔值作为元素的列表，表示数据点是否满足定义）
  // 默认的映射函数仅判断它们是否为数值 isNaN()
  if (defined === undefined) defined = (d, i) => !isNaN(X[i]) && !isNaN(Y[i]);
  // 本例子使用默认的映射函数，仅以横坐标值和纵坐标值是否为数值作为判断基准
  const D = d3.map(data, defined);

  /**
   *
   * 构建坐标轴
   *
   */
  // 计算横坐标的定义域范围
  // 使用了 d3.nice() 对原来的 d3.extent() 范围进行调整，使得起始值和结束值可读性更好，便于构建坐标轴的刻度
  if (xDomain === undefined) xDomain = d3.nice(...d3.extent(X), width / 80);
  // 计算纵坐标的定义域范围
  if (yDomain === undefined) yDomain = d3.nice(...d3.extent(Y), height / 50);

  // 构建比例尺
  const xScale = xType(xDomain, xRange);
  const yScale = yType(yDomain, yRange);
  // 构建坐标轴
  const xAxis = d3.axisBottom(xScale).ticks(width / 80, xFormat);
  const yAxis = d3.axisLeft(yScale).ticks(height / 50, yFormat);

  /**
   *
   * 生成图形
   *
   */
  // 绘制横坐标轴
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`) // 将横坐标轴容器定位到底部
    .call(xAxis) // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来
    .call((g) => g.select(".domain").remove()) // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone() // 这里复制了一份刻度线，用以绘制散点图中纵向的网格参考线
        .attr("y2", marginTop + marginBottom - height) // 调整复制后的刻度线的终点位置（往上移动）
        .attr("stroke-opacity", 0.1)
    ) // 调小网格线的透明度
    .call((g) =>
      g
        .append("text") // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
        .attr("x", width)
        .attr("y", marginBottom - 4) // 添加的额外文字定位到坐标轴的顶部
        .attr("fill", "currentColor")
        .attr("text-anchor", "end") // 设置文本的对齐方式
        .text(xLabel)
    ); // 设置文字内容

  // 绘制纵坐标轴
  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
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
        .text(yLabel)
    );

  // 线段生成器
  const line = d3
    .line()
    .curve(curve) // 设置曲线插值生成器，两点之间以曲线进行连接
    // 设置数据完整性检验函数
    // 当函数返回 false 时，该元素就会就会跳过，当前线段就会截至，并在下一个有定义的元素再开始绘制
    // 反映在图上就是一段段分离的线段
    .defined((i) => D[i])
    .x((i) => xScale(X[i])) // 设置横坐标读取函数，一般利用比例尺进行映射，返回横坐标值在图形中的相应尺寸位置
    .y((i) => yScale(Y[i])); // 设置纵坐标读取函数
  // 以上设置线段生成器不同参数的各种方法中，其入参值 i 是数据点的索引值
  // 所以下面调用线段生成器生成连线 d 属性值时，入参是 I 数据点的索引列表

  // 绘制连线
  const path = svg
    .append("path")
    .attr("fill", "none")
    // 设置连线样式
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth)
    .attr("stroke-linejoin", strokeLinejoin)
    .attr("stroke-linecap", strokeLinecap)
    .attr("d", line(I)); // 设置连线的 d 属性，线段生成器 line() 会生成该属性值（入参是 I，作为数据点的索引列表）

  // 绘制数据点
  svg
    .append("g")
    .attr("fill", fill)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth)
    .selectAll("circle")
    .data(I.filter((i) => D[i])) // 绑定数据，入参值先进行数据清洗，这样就可以只绘制满足定义的数据点
    .join("circle")
    .attr("cx", (i) => xScale(X[i]))
    .attr("cy", (i) => yScale(Y[i]))
    .attr("r", r);

  // 绘制数据点的标注信息
  const label = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("stroke-linejoin", "round")
    // 这里是为每一个数据点的标注信息创建一个容器
    // 因为标注信息是包括文本和文本的「描边」（其实就是颜色为白色的文本）
    // 以便同时设置两个元素的位置
    .selectAll("g")
    .data(I.filter((i) => D[i])) // 绑定数据，入参值先进行数据清洗，这样就可以只绘制满足定义的数据点
    .join("g")
    .attr("transform", (i) => `translate(${xScale(X[i])},${yScale(Y[i])})`); // 设置标注信息的位置，与相应的数据点位置一样

  if (T)
    label
      .append("text")
      .text((i) => T[i]) // 设置文本内容
      // 为选择集中的每个元素都调用一次函数
      // 调整标注信息的位置
      .each(function (i) {
        const t = d3.select(this);
        // 基于方位来设置文本的偏移值
        switch (O[i]) {
          case "bottom":
            t.attr("text-anchor", "middle").attr("dy", "1.4em");
            break;
          case "left":
            t.attr("dx", "-0.5em")
              .attr("dy", "0.32em")
              .attr("text-anchor", "end");
            break;
          case "right":
            t.attr("dx", "0.5em")
              .attr("dy", "0.32em")
              .attr("text-anchor", "start");
            break;
          default:
            t.attr("text-anchor", "middle").attr("dy", "-0.7em");
            break;
        }
      })
      .call((text) => text.clone(true)) // 复制一份文本，作为「描边」可以有效地凸显文字内容，且避免其他元素对文字遮挡
      .attr("fill", "none")
      .attr("stroke", halo)
      .attr("stroke-width", haloWidth);

  // 测量给定的路径 path 的长度
  function length(path) {
    // 这里使用 d3.create("svg:path") 创建一个 `<path>` 元素，并显式地指明其命名空间（以保证创建的元素是标准的 HTML 元素）
    // 并设置路径的形状（通过设置 `d` 属性）
    // 使用方法 selection.node() 获取选择集中唯一的元素 <path>
    // 调用 svg 元素的方法 SVGPathElement.getTotalLength() 获取该路径的长度
    return d3.create("svg:path").attr("d", path).node().getTotalLength();
  }

  // 路径展开动效
  function animate() {
    if (duration > 0) {
      const l = length(line(I)); // 获取总路径的长度

      // 为路径设置展开的过渡动效
      path
        .interrupt() // 先执行一次动画中断操作，避免有未完成的动画在进行时又开启一次新的动画
        // 通过设置更改路径（描边）的点划线的图案规则，即属性 stroke-dasharray，来实现路径展开动画
        // 该属性值由一个或多个（用逗号或者空白隔开）数字构成
        // 这些数字组合会依次表示划线和缺口的长度
        // 即第一个数字表示划线的长度，第二个数表示缺口的长度，然后下一个数字又是划线的长度，依此类推
        // 如果该属性值的数字之和小于路径长度，则重复这个数字来绘制划线和缺口，这样就会出现规律的点划线图案
        // 这里首先将属性 stroke-dasharray 设置为 `0,${l}`
        // 即路径的划线部分为 0，全部都是缺口
        // 所以效果是过渡开始时，路径为空，是不可见的
        .attr("stroke-dasharray", `0,${l}`)
        // 设置过渡动效
        // 更改的属性是 stroke-dasharray
        .transition()
        .duration(duration) // 过渡的时间
        .ease(d3.easeLinear)
        // 然后再将其设置为 `${l},${l}`（其实也可以是 `${l},0`，因为路径（描边）的划线部分是先显示的，所以最终效果一样）
        // 即路径的划线的长度和路径总长度相同，缺口也一样
        // 所以效果是过渡结束时，路径完全显示
        .attr("stroke-dasharray", `${l},${l}`);

      // 为标注信息设置透明度的过渡动效
      label
        .interrupt()
        // 通过更改透明度来隐藏/显示标注信息
        .attr("opacity", 0) // 先将透明度设置为 0 隐藏所有的标注信息
        .transition()
        // 为各个标注信息设置**不同**的延迟时间
        // 以实现标注信息和路径展开同步显示的效果
        // 因为标注信息的选择集 label 所绑定的数据是表示数据点的索引列表
        // 所以这里可以直接通过索引值，来获取该标注信息所对应的路径长度 length(line(I.filter(j => j <= i)))
        // I.filter(j => j <= i) 是将整个索引列表截短，只包括比当前索引值小的元素，对应于已展开的路径
        // 然后通过这一段截短路径占整个路径 l 的比例，换算出需要延迟多长时间
        // duration - 125 做了一些小修正，在路径展开到来前，让标注信息提前一点点时间先显示
        .delay(
          (i) => (length(line(I.filter((j) => j <= i))) / l) * (duration - 125)
        )
        .attr("opacity", 1); // 最后将透明度都设置为 1 显示所有标注信息（但是由于不同元素的动效延迟时间不同，所以可以形成是依次显示的效果）
    }
  }

  animate();
}

/**
 *
 * 构建 svg 并获取尺寸大小等参数
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
let width = container.clientWidth; // 宽度
let height = container.clientHeight; // 高度

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
 * 获取和解析数据
 *
 */
// 数据来源 https://observablehq.com/@d3/connected-scatterplot
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/c14ccf52abd47c3d4bde0890ace01343/raw/65faff1c8d6fecd02d77652ae67be97d2b6c0016/driving.csv";

// 因为异步获取得到的数据，其类型都是字符串，所以要使用 `d3.autotype` 作为数据的转换函数
// 自动推断数据类型，将字符串转换为相应的数据类型
d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data[0]);

  // 构建散点图并展开路径
  ConnectedScatterplot(data, svg, {
    x: (d) => d.miles,
    y: (d) => d.gas,
    title: (d) => d.year,
    orient: (d) => d.side,
    yFormat: ".2f", // 纵坐标轴的刻度值保留 2 位小数
    xLabel: "Miles driven (per capita per year) →",
    yLabel: "↑ Price of gas (per gallon, adjusted average $)",
    width,
    height,
    duration: 5000 // 路径展开的过渡动效持续时间（默认值为 0 即无过渡动效）
  });
});
