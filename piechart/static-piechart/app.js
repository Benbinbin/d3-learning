// 参考自 https://observablehq.com/@d3/pie-chart/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  // 通过 viewBox 将视图区域向左移动 width/2 向上移动 height/2，让 (0, 0) 位于视图区域的中心
  // 这样就可以让饼图的圆心位于视图中心
  .attr("viewBox", [-width / 2, -height / 2, width, height])
  .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/pie-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/434a8c4b67e5ed66958055928a7c7b34/raw/6b8baac8a108f25f6235de08a9003b131fdf3911/population-by-age.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置颜色比例尺
  // 为不同扇形设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
      // 设置定义域范围
      // 各扇形的名称，即 18 种年龄段
      .domain(data.map(d => d.name))
      // 设置值域范围
      // 这里使用 d3.quantize(interpolator, n) 方法根据指定的 interpolator 插值函数，返回 n 个等间隔的均匀采样值（一个数组）
      // 该方法是由 d3-interpolate 模块提供的插值器（该模块还内置一些其他的插值器），具体介绍可以查看官方文档 https://d3js.org/d3-interpolate/value#quantize
      // 💡 关于插值器的介绍，可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#插值器
      // 所使用的 interpolator 插值函数是 t => d3.interpolateSpectral(t * 0.8 + 0.1) 💡 参数 t 的取值范围是  [0, 1]
      // 其中 d3.interpolateSpectral() 是一种配色方案，它会根据传入的参数（范围在 [0,1] 之间）计算出相应的颜色值
      // 它可以在发散型的光谱（从暖色系过渡到冷色系）中选取配色，具体参考官方文档 https://d3js.org/d3-scale-chromatic/diverging#interpolateSpectral
      // 💡 这里是基于参数 t 进行调整，由于 t * 0.8 + 0.1 的范围是在 0.1 到 0.9 之间，所以在更窄的色谱范围中进行采样，得到一系列色差较少的颜色值
      // 所采样的数量是与 data.length 数据项的数量一样
      // 得到一系列的颜色值（一个数组），并对其进行反向 reverse 排序
      // 最终得到一系列从冷色系到暖色系的颜色值
      .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length).reverse());

  /**
   *
   * 对数据进行转换
   *
   */
  // Create the pie layout and arc generator.
  // 使用 d3.pie() 创建一个 pie 饼图角度生成器
  // 饼图角度生成器会基于给定的数据，计算各数据项所所对应的扇形在饼图中所占的角度
  // 调用饼图角度生成器时返回的结果是一个数组，它的长度和入参的数组长度一致，元素的次序也一样，其中每个元素（是一个对象）依次对应一个数据项，并包含以下属性：
  // * data 数据项的值
  // * value 一个数值，它代表了该数据项，被用于在 Pie 饼图生成器里进行运算（以计算该数据项所需占据的角度）
  // * index 数据项的索引，从 0 开始
  // * starAngle 该数据项在扇形或环形中所对应的起始角
  // * endAngle 该数据项在扇形或环形中所对应的结束角
  // * padAngle 扇形或环形的间隔角度
  // 具体可以参考官方文档 https://d3js.org/d3-shape/pie
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#pies-饼图角度生成器
  const pie = d3.pie()
  // 设置数据项的排序对比函数（用于决定相应扇形的优先次序）
  // 💡 此处所说的排序，实际上体现在各数据项所对应的扇形的起始角度和结束角度上，而不会改变数组中的元素的次序（经过排序后返回的数组的元素次序，和数据表中数据项的顺序是相同的）
  // 虽然数据项的排序对比函数默认值就是 `null`，但是这里依然显式地将对比函数设置为 null
  // 这是为了让 D3 隐式地调用 ` pie.sortValues(null)` 将数据项转换值的对比函数设置为 `null`（它的默认值是 `d3.descending` 降序排列），以忽略按数据项的转换值进角度排序
  // 如果 `pie.sort` 数据项的对比函数 ，以及 `pie.sortValues` 它的转换值的对比函数都是 `null`，则各扇形的排序与原始数据集中各数据项顺序一致
  // 所以最终各扇形是按照相应的数据项在原始数据集中的顺序进行排序（即年龄段从小到大进行排序，而不是按照人口占比的多少进行排序）
  .sort(null)
  // 设置 value accessor 数据访问器，即每个数据项经过该函数的转换后，再传递给 Pie 饼图角度生成器
  .value(d => d.value);

  // 调用饼图角度生成器，对原始数据集 data 进行转换处理
  // 计算出每个数据点所对应的扇形的相关信息（主要是起始角和结束角）
  const arcs = pie(data);

  /**
   *
   * 绘制饼图内的扇形形状
   *
   */
  // 使用 d3.arc() 创建一个 arc 扇形生成器
  // 扇形生成器会基于给定的数据生成扇形形状
  // 调用 扇形生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/arc
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#扇形生成器-arcs
  const arc = d3.arc()
      // 设置内半径，参数为 0 则生成扇形；如果参数不为 0 则生成环形
      .innerRadius(0)
      // 设置外半径，是 svg 宽或高（较短的一边为基准）的一半
      .outerRadius(Math.min(width, height) / 2 - 1);

  // 将每个扇形的面积形状绘制到页面上
  // 创建一个元素 <g> 作为容器
  // Add a sector path for each value.
  svg.append("g")
      .attr("stroke", "white") // 每个扇形的描边为白色（便于区分）
    .selectAll() // 返回一个选择集，其中虚拟/占位元素是一系列的 <path> 路径元素，用于绘制各扇形的形状
    .data(arcs) // 绑定数据，每个路径元素 <path> 对应一个扇形数据
    .join("path") // 将元素绘制到页面上
      // 设置颜色，不同扇形对应不同的颜色
      // 其中 d 是所绑定的数据，d.data 是原始数据点，所以 d.data.name 就是该扇形所对应的年龄段（名称）
      // 再通过颜色比例尺 color() 可以得到该扇形的相应颜色值
      .attr("fill", d => color(d.data.name))
      // 由于扇形生成器并没有调用方法 area.context(canvasContext) 设置画布上下文
      // 所以调用扇形生成器 arc 返回的结果是字符串
      // 该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", arc)
    // 在每个路径元素 <path> 里添加一个 <title> 元素
    // 以便鼠标 hover 在相应的各系列的面积之上时，可以显示 tooltip 提示信息
    .append("title")
      // 设置 tooltip 的文本内容 d.data.name 表示当前所遍历的年龄段名称，d.data.value 是对应的人口数量（它是一个数字，并使用 JS 原生方法 number.toLocaleString("en-US") 进行格式化）
      .text(d => `${d.data.name}: ${d.data.value.toLocaleString("en-US")}`);

  /**
   *
   * 添加标注信息
   *
   */
  // 该变量表示每个扇形的标注文本相对于圆心的距离
  // 是大饼图的外半径的 0.8 倍
  // 相当于使用原始数据集，可以绘制出一个半径更小的饼图（用于定位标注文本），而它的各个扇形部分和大的饼图是一致的
  const labelRadius = arc.outerRadius()() * 0.8;

  // A separate arc generator for labels.
  // 创建另一个 arc 扇形生成器，在后面 👇 会借助它计算出各扇形的中点位置
  const arcLabel = d3.arc()
      // 该饼图的内半径和外半径是一样的，所以小饼图相当于一个圆（只有圆周一圈，而没有面积）
      // 所以在后面 👇 借助它计算各扇形的文本标注位置时，最终效果是将标注信息定位到该饼图的外周上
      .innerRadius(labelRadius)
      .outerRadius(labelRadius);

  // 为各扇形添加文本标注信息
  // 创建一个元素 <g> 作为容器
  // Create a new arc generator to place a label close to the edge.
  // The label shows the value if there is enough room.
  svg.append("g")
      .attr("text-anchor", "middle") // 设置文本对齐方式，居中对齐
    .selectAll() // 返回一个选择集，其中虚拟/占位元素是一系列的 <text> 文本元素，用于为各扇形的添加文本标注
    .data(arcs) // 绑定数据，每个文本元素 <text> 对应一个扇形数据
    .join("text") // 将元素绘制到页面上
      // 通过设置 CSS 的 transform 属性将文本元素「移动」到相应的扇形的中点
      // 各扇形的中点是使用另一个扇形生成器 arcLabel 的方法 arcLabel.centroid(d) 计算而得的
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
      // 在当前所遍历的 <text> 元素里添加一个 <tspan> 元素
      // 它相当于在 svg 语境下的 span 元素，用于为部分文本添加样式（这里用于实现文本的换行效果）
      .call(text => text.append("tspan")
          // 设置 <tspan> 元素的纵向偏移量，是 -0.4em 表示向上移动，相当于在第一行（em 单位是与字体大小相同的长度）
          .attr("y", "-0.4em")
          .attr("font-weight", "bold") // 将文字加粗
          .text(d => d.data.name)) // 设置文本内容，是当前所遍历的年龄段的名称
      //  然后（根据对应扇形的角度大小）选择性地在当前所遍历的 <text> 元素里添加文本信息（人口数量）
      .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
          // 设置该元素的横向偏移量为 0
          .attr("x", 0)
          // 设置该元素的横向偏移量为 0.7em，表示向下移动，相当于在第二行
          .attr("y", "0.7em")
          .attr("fill-opacity", 0.7) // 设置透明度
          .text(d => d.data.value.toLocaleString("en-US"))); // 设置文本内容，不同年龄段的相应人口数量
    // 以上通过 selection.call(axis) 的方式来调用一次给定的函数
    // 它会将选择集传递给函数，作为第一个参数
    // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
    // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法
});
