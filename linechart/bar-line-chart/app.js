// 参考自 https://observablehq.com/@d3/bar-line-chart

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 对象的作用是在 svg 的外周设置留白，构建一个显示的安全区，以便在四周显示坐标轴
const margin = { top: 20, right: 30, bottom: 30, left: 40 };

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
// 数据来源网页 https://observablehq.com/@d3/bar-line-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/adc5f7e08b5a25822d94491410b00a84/raw/231d0ecf6c266289da0969f5a890f6353744980f/new-passenger-cars.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是不同的年份（类别），使用 d3.scaleBand 构建一个带状比例尺
  // 使用 d3-scale 模块
  // 具体参考官方文档 https://d3js.org/d3-scale/band 或 https://github.com/d3/d3-scale#scaleBand
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
  const x = d3.scaleBand()
    // 设置定义域范围（年份）
    .domain(data.map(d => d.year))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .rangeRound([margin.left, width - margin.right])
    .padding(0.1) // 并设置间隔占据（柱子）区间的比例

  // 设置左侧纵坐标轴的比例尺
  // 左侧纵坐标轴的数据是连续型的数值（载客车的销量），使用 d3.scaleLinear 构建一个线性比例尺
  // 具体参考官方文档 https://d3js.org/d3-scale/linear 或 https://github.com/d3/d3-scale/tree/main#linear-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const y1 = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是各年份载客车的销量中的最大值
    .domain([0, d3.max(data, d => d.sales)])
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    // 使用 continue.rangeRound() 方法，可以进行修约，以便实现整数（汽车的销量）映射到整数（像素）
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    .rangeRound([height - margin.bottom, margin.top])

  // 设置右侧纵坐标轴的比例尺
  // 右侧纵坐标轴的数据是连续型的数值（燃油效率），使用 d3.scaleLinear 构建一个线性比例尺
  const y2 = d3.scaleLinear()
    // 设置定义域范围
    // [ymin, ymax] 使用 d3.extent() 计算出数据集中燃油效率的范围
    .domain(d3.extent(data, d => d.efficiency))
    // 设置值域范围
    .rangeRound([height - margin.bottom, margin.top])

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - margin.bottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    .call(d3.axisBottom(x)
      // 自定义坐标轴的刻度值
      // 通过 axis.tickValues([values]) 传递一个数组，用其中的元素覆盖比例尺自动生成的刻度值
      // 方法 d3.ticks(start, stop, count)
      // 根据 count 数量对特定范围（由 start 和 stop 指定）进行均分，返回一个包含一系列分隔值的数组，用作刻度值
      // 第一、二个参数 start 和 stop 分别指定范围的起始和结束值
      // 这里先通过 d3.extent(x.domain()) 获取横坐标轴比例尺的定义域范围
      // 返回值是一个数组 [xmin, xmax]，再通过解构来获取 start 和 stop
      // 第三个参数 count 作为分割数量的参考值，避免过多的刻度值出现，相互重叠影响阅读
      // 具体参考官方文档 https://d3js.org/d3-array/ticks#ticks 或 https://github.com/d3/d3-array/tree/main#ticks
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#刻度生成
      // 对于方法 d3.ticks(start, stop, count) 所返回的数组，再通过 arr.filter() 对里面的元素进行筛选
      // 通过横坐标轴的比例尺验证 x(v) 仅留下在数据集中有对应数据的年份
      .tickValues(d3.ticks(...d3.extent(x.domain()), width / 40).filter(v => x(v) !== undefined))
      // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .tickSizeOuter(0))
  // 💡 注意以上通过方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制左侧纵坐标轴（载客车的销量）
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${margin.left},0)`)
    .style("color", "steelblue") // 设置坐标轴的颜色
    // 左侧的纵轴是一个刻度值朝左的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
    // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks 或 https://github.com/d3/d3-axis/blob/v3.0.0/README.md#axis_ticks
    // 其中第一个参数用于设置刻度数量，这里设置为 `null` 表示采用默认的刻度生成器
    // 而第二个参数用于设置刻度值格式，这里设置为 "s" 表示数值采用 SI-prefix 国际单位制词头，例如 k 表示千，M 表示百万
    // 具体参考 https://en.wikipedia.org/wiki/Metric_prefix
    // 关于 D3 所提供的数值格式具体参考官方文档 https://github.com/d3/d3-format
    .call(d3.axisLeft(y1).ticks(null, "s"))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的顶部（即容器的左上角）
      .attr("x", -margin.left)
      .attr("y", 10)
      .attr("fill", "currentColor") // 设置文本的颜色
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .text(data.y1)) // 设置文本内容

  // 绘制右侧纵坐标轴（载客车的油耗）
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到右侧
    .attr("transform", `translate(${width - margin.right},0)`)
    // 右侧的纵轴是一个刻度值朝右的坐标轴
    .call(d3.axisRight(y2))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      .attr("x", margin.right)
      .attr("y", 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "end")
      .text(data.y2))

  /**
   *
   * 绘制图表内容
   * 包括条形图和折线图
   *
   */
  // 绘制条形图内的柱子
  svg.append("g")
    .attr("fill", "steelblue") // 设置柱子的颜色
    .attr("fill-opacity", 0.8) // 设置柱子的透明度
    .selectAll("rect") // 使用 <rect> 元素来绘制柱子
    .data(data) // 绑定的数据
    .join("rect") // 将元素绘制到页面上
    // 为每个矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    // 每个矩形的左上角横轴定位 x 由它所绑定的数据点的年份 d.year 决定
    // 使用横坐标轴的比例尺（带状比例尺）x(d.year) 进行映射，求出具体的横轴坐标值
    .attr("x", d => x(d.year))
    // 每个矩形的宽度
    // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("width", x.bandwidth())
    // 每个矩形的左上角纵轴定位 y 由它所绑定的数据点的销量 d.sales 决定
    // 使用左侧纵坐标轴的比例尺（线性比例尺）y1(d.sales) 进行映射，求出具体的纵轴坐标值
    .attr("y", d => y1(d.sales))
    // 每个矩形的高度
    // 由所绑定的数据点的销量决定 d.sales 与左侧纵轴的零点之间的差值所决定
    // ⚠️ 注意这里的差值是 y1(0) - y1(d.sales) 因为 svg 的坐标体系中向下是正方向
    // 所以零点对应的左侧纵坐标值 y1(0) 会更大，减去 y1(d.sales) 的值求出的差值才是高度
    .attr("height", d => y1(0) - y1(d.sales));

  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line 或 https://github.com/d3/d3-shape/tree/main#lines
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的年份 d.year 并采用比例尺 x 进行映射，计算出相应的横坐标
    // 💡 实际的横坐标宽度还要加上条带的一半宽度 x.bandwidth() / 2
    // 💡 这是为了让折线图的每个数据点与条形图的相应条带的（垂直）中心对齐，所以横坐标添加上条带的一半宽度
    .x(d => x(d.year) + x.bandwidth() / 2)
    // 设置纵坐标读取函数
    .y(d => y2(d.efficiency))

  // 绘制折线图内的线段
  svg.append("path") // 使用路径 <path> 元素绘制折线
    .attr("fill", "none") // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("stroke", "currentColor") // 设置描边颜色
    // stroke-miterlimit 属性约束两段折线相交时接头的尖端长度
    // 如果在绘制折线图时数据点较多，可以将元素 `<path>` 的属性 `stroke-miterlimit` 设置为 `1`
    // 以避免折线「锋利」交接处过渡延伸，导致该点的数据偏移
    .attr("stroke-miterlimit", 1)
    .attr("stroke-width", 3) // 设置描边宽度
    // 调用线段生成器 line(data) 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line(data));

  /**
   *
   * 为图表添加注释信息
   *
   */
  // 以 tooltip 的方式展示注释信息，即鼠标 hover 到特定的区域时才显示一个带有注释信息的浮窗
  svg.append("g")
    // 这里在原来的图表（折线图和条形图）上面再添加一层「不可见」的条形图
    // 所以这里将填充 fill 设置为 none
    .attr("fill", "none")
    // ⚠️ 由于属性 fill 设置为 none 的 SVG 元素无法成为鼠标事件的目标
    // 需要将 pointer-events 设置为 all 进行「校正」，则该元素在任何情况下（无论属性 fill 设置为任何值）都可以响应指针事件
    .attr("pointer-events", "all")
    // 以下代码是再绘制一个「不可见」的条形图
    // 大部分步骤都是和前面所绘制条形图的步骤一致
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.year))
    .attr("width", x.bandwidth())
    // 这些矩形是铺满覆盖整个 svg 画布区域
    // 每个矩形的左上角纵轴定位 y 都是 0，即位于 svg 的最顶端
    .attr("y", 0)
    //  每个矩形的高度都是整个 svg 的高度
    .attr("height", height)
    // 最后为每个矩形 <rect> 元素之内添加 <title> 元素
    // 以便鼠标 hover 在相应的小矩形之上时，可以显示 tooltip 提示信息
    .append("title")
    // 设置 tooltip 的文本内容
    // 其中 {d.year 是所属的年份
    // 而 d.sales.toLocaleString("en") 是汽车销量，并将数字转换为特定语言环境下的字符串形式
    // 而 d.efficiency.toLocaleString("en") 就是汽车油耗，并将数字转换为特定语言环境下的字符串形式
    .text(d =>
    `${d.year}
    ${d.sales.toLocaleString("en")} new cars sold
    ${d.efficiency.toLocaleString("en")} mpg average fuel efficiency`);

});
