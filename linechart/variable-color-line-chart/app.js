// 参考自 https://observablehq.com/@benbinbin/variable-color-line

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

// 不同天气状况（用英文缩写表示）与不同的对象进行映射，每个对象中具有 label 和 color 属性
// * 属性 label 是对英文缩写的注释（具体的内容）
// * 属性 color 是对应的线段颜色
const conditions = new Map([
  // 晴朗
  ["CLR", { label: "Clear", color: "deepskyblue" }],
  // 少云
  ["FEW", { label: "Few clouds", color: "lightskyblue" }],
  // 散云
  ["SCT", { label: "Scattered clouds", color: "lightblue" }],
  // 多云
  ["BKN", { label: "Broken clouds", color: "#aaaaaa" }],
  // 阴天
  ["OVC", { label: "Overcast", color: "#666666" }],
  // 垂直能见度
  ["VV ", { label: "Indefinite ceiling (vertical visibility)", color: "#666666" }]
])

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@benbinbin/variable-color-line 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/edc940093f9fcbd2a947f4597d8a58b6/raw/4654a106ae75afce5bfe9331b783464624fcbb62/fcm.csv";

// 读取 csv 文件并载入其中的数据集作为一个数组
// 参考 d3-dsv 模块 https://github.com/d3/d3-dsv
// 因为异步获取得到的数据，其类型都是字符串，所以要使用 `d3.autotype` 作为数据的转换函数
// 自动推断数据类型，将字符串转换为相应的数据类型
d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，处于不同时区的用户也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time 或 https://github.com/d3/d3-scale#time-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleUtc()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
    .domain(d3.extent(data, d => d.date))
    // 设置值域范围（所映射的可视元素）
    // 使用 scale.rangeRound() 方法，可以进行修约，以便实现整数（日期）映射到整数（像素）
    // svg 元素的宽度（减去留白区域）
    .rangeRound([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（温度），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出温度值，并用 d3.extent() 计算出它的范围
    // 另外还使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
    // 具体参考官方文档 https://github.com/d3/d3-scale#continuous_nice
    .domain(d3.extent(data, d => d.temperature)).nice()
    // 设置值域范围（所映射的可视元素）
    // svg 元素的高度（减去留白区域）
    .rangeRound([height - marginBottom, marginTop]);

  // 设置颜色比例尺
  // 为不同天气状况设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal 或 https://github.com/d3/d3-scale/tree/main#scaleOrdinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal(
    // 设置定义域范围
    // 各种天气状况的名称（英文缩写）
    // 从 conditions.keys() 返回一个可迭代对象（包含映射的所有键名）读取共 6 种天气状况
    conditions.keys(),
    // 设置值域范围
    // 从 conditions.values() 返回一个可迭代对象（包含映射的所有值），构成为一个数组 Array.from()
    // 再从每个元素（一个对象）中读取出自定义的颜色值 d.color
    Array.from(conditions.values(), d => d.color))
    // 设置默认值，对于未手动设置颜色映射值的天气状况，采用黑色作为默认的映射颜色
    .unknown("black");

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove());
  // 💡 注意以上通过方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 💡 为纵坐标轴添加注释（温度的单位标记）
    // 这里并没有添加一个 <text> 元素
    // 而是直接选取坐标轴的最后一个刻度（通过 class 选择器 .tick:last-of-type）里面的 `<text>` 标签
    // 再在 `<text>` 元素里添加 `<tspan>` 元素，并设置内容，这样就可以为 `<text>` 元素添加额外的文本
    .call(g => g.select(".tick:last-of-type text").append("tspan").text("℃"));

  /**
   *
   * 绘制网格参考线
   *
   */
  svg.append("g")
    .attr("stroke", "currentColor") // 设置网格参考线的颜色
    .attr("stroke-opacity", 0.1) // 调小网格线的透明度
    // 绘制纵向的网格参考线
    .call(g => g.append("g")
      // 使用 <line> 元素来绘制参考线
      .selectAll("line")
      // 绑定的数据是时间比例尺 x 所对应的刻度数据
      // 调用时间比例尺的方法 x.ticks() 会返回其定义域的数据（一个数组，被用作刻度值）
      .data(x.ticks())
      .join("line") // 将线段绘制到页面上
      // 分别设置各个线段的起始点的坐标 (x1, y1) 和终止点的坐标 (x2, y2)，以绘制一条条纵向参考线（垂直于横坐标轴）
      // 起始点的横坐标 x1 由其所绑定的数据（日期）所决定
      // 通过时间比例尺 x(d) 通过日期映射/计算出相应的横坐标轴的值，并在该基础上加上 0.5px
      // ❓ 由于刻度线的宽度默认是 1px，所以进行 0.5px 偏移，让网格参考线位于刻度线的中间开始延伸
      .attr("x1", d => 0.5 + x(d))
      //（纵向参考线）终止点的横坐标 x2 和 x1 的值是一样的
      .attr("x2", d => 0.5 + x(d))
      // 起始点的纵坐标 y1 等于 marginTop（相当于位于 svg 顶部，但减去了顶部的留白）
      .attr("y1", marginTop)
      // 终止点的纵坐标 y2 等于 height - marginBottom（相当于位于 svg 底，但减去了底部的留白）
      .attr("y2", height - marginBottom))
    // 绘制横向的网格参考线
    .call(g => g.append("g")
      .selectAll("line")
      // 绑定的数据是线性比例尺 y 所对应的刻度数据
      .data(y.ticks())
      .join("line")
      .attr("y1", d => 0.5 + y(d))
      .attr("y2", d => 0.5 + y(d))
      .attr("x1", marginLeft)
      .attr("x2", width - marginRight));

  /**
   *
   * 创建线性渐变色
   *
   */
  // 在参考的 Observable Notebook 使用了平台的标准库所提供的方法 DOM.uid(namespace) 创建一个唯一 ID 号
  // 具体参考 https://observablehq.com/@observablehq/stdlib#cell-790
  // 用作元素 <linearGradient> 的 id 属性值
  // const colorId = DOM.uid("color");
  // 这里使用硬编码（手动指定）id 值
  const colorId = "colorGradient";

  // 使用 svg 元素 <linearGradient> 定义线性渐变色，用于图形元素的填充或描边
  svg.append("linearGradient")
    // 设置 id 属性
    // 使用该值来引用/指向该渐变色，以将其应用到图形元素上
    .attr("id", colorId)
    // 💡 设置 gradientUnits 属性，它用于配置渐变的坐标系（涉及 x1, x2 等属性）
    // 它的属性值可以设置为 `userSpaceOnUse` 或 `objectBoundingBox`（默认值）
    // 这两个值的区别在于坐标的**参考系**不同
    // * 属性值 userSpaceOnUse 表示渐变中的坐标值是相对于用户坐标系统的，即无论渐变被应用到哪个元素上，它的坐标都是相对于**整个 SVG 画布的 viewport 视图**
    // * 属性值 objectBoundingBox（默认值）表示渐变中的坐标值是相对于**引用元素的边界框**的，即渐变的坐标将根据引用元素的大小和位置进行缩放和定位，其中 (0,0) 表示边界框的左上角，(1,1) 表示边界框的右下角
    // 这里采用 userSpaceOnUse 即以整个 SVG 视图作为渐变坐标的参考系
    // 由于使用 <stop> 元素进行渐变色的切换时，其定位（属性 offset）是通过横坐标值 x(d.date) 和 svg 的宽度计算得到的（比例）
    // 而横坐标轴比例尺 x 和 svg 的宽度，这两者的坐标的参考系都是相对于整个 SVG 视图的
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0) // 渐变色的起始点的横坐标
    .attr("x2", width) // 渐变色的终止点的横坐标
    // 这里没有设置起始点和终止点的纵坐标，由于渐变色是沿横坐标轴变化的，而且它是应用到线段的描边上（并不是填充）
    // 所以纵坐标采用默认值 0% 即可
    // 进行二次选择，在元素 <linearGradient> 内添加一系列的 <stop> 元素，以切换渐变色
    .selectAll("stop")
    .data(data) // 绑定数据
    .join("stop") // 将 <stop> 元素添加到页面上
    // 通过 offset 属性设置该颜色的定位（相对于整个 SVG 视图），采用 x(d.date) / width 百分比形式
    // 所绑定的数据（对象）的属性 d.date 获取日期，再通过比例尺 x 的映射 x(d.date) 得到对应的横坐标
    // 再与 svg 的宽度相比 x(d.date) / width 得到百分比
    .attr("offset", d => x(d.date) / width)
    // 通过 stop-color 属性设置颜色
    // 所绑定的数据（对象）的属性 d.condition 获取天气状况，再通过比例尺 color 的映射 color(d.condition) 得到对应的颜色值
    .attr("stop-color", d => color(d.condition));

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line 或 https://github.com/d3/d3-shape/tree/main#lines
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveStep
    // 该插值效果是在两个数据点之间，生成阶梯形状的线段
    // 具体效果参考 https://d3js.org/d3-shape/curve#curveStep 或 https://github.com/d3/d3-shape#curveStep
    .curve(d3.curveStep)
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期 d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.date))
    // 设置纵坐标读取函数
    .y(d => y(d.temperature));

  // 将线段路径绘制到页面上
  svg.append("path") // 使用路径 <path> 元素绘制折线
    // 绑定数据
    // 这里采用 selection.datum(value) 为选择集中的每个元素上绑定的数据（该选择集里只有一个 <path> 元素）
    // ⚠️ 它与 selection.data(data) 不同，该方法不会将数组进行「拆解」，即这个方法不会进行数据链接计算并且不影响索引，不影响（不产生）enter 和 exit 选择集，而是将数据 value 作为一个整体绑定到选择的各个元素上，因此使用该方法选择集的所有 DOM 元素绑定的数据都一样
    // 具体参考官方文档 https://d3js.org/d3-selection/joining#selection_datum 或 https://github.com/d3/d3-selection/tree/main#selection_datum
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#绑定数据
    .datum(data)
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    // 这里通过 id 值（拼接出特定格式的字符串/链接）来引用/使用前面所创建的渐变色
    .attr("stroke", `url('#${colorId}')`)
    // 设置描边宽度
    .attr("stroke-width", 2)
    // 设置折线之间的连接样式（圆角让连接更加平滑）
    .attr("stroke-linejoin", "round")
    // 设置路径端点的样式
    .attr("stroke-linecap", "round")
    // 调用线段生成器 line
    // 将其返回的结果（字符串）作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line);
});
