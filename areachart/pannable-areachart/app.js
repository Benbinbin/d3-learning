// 参考自 https://observablehq.com/@d3/pannable-chart

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 页面宽度
const totalWidth = width * 6; // svg 的宽度是页面宽度的 6 倍
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 30;

// // 创建 svg
// // 在容器 <div id="container"> 元素内创建一个 SVG 元素
// // 返回一个选择集，只有 svg 一个元素
// const svg = d3
//   .select("#container")
//   .append("svg")
//   .attr("width", width)
//   .attr("height", height)
//   .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/pannable-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/61a819373d0eada06b7966a560aafc7e/raw/979711fba712b0263309234239bfbd144a8a3edc/aapl.csv";

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
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  // Create the horizontal (x) scale over the total width.
  const x = d3.scaleUtc()
      // 设置定义域范围
      // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
      .domain(d3.extent(data, d => d.date))
      // 设置值域范围（所映射的可视元素）
      // svg 元素的宽度（减去留白区域）
      .range([marginLeft, totalWidth - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（股价），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
      // 设置定义域范围
      // [0, ymax] 其中 ymax 是股价的最高值
      // 通过 d3.max(data, d => d.close) 从数据集中获取股价的最大值
      // 并使用 continuous.nice(count) 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
      // 其中参数 count 是一个数字，用于设置该比例尺所对应的坐标轴的刻度线数量，D3 会以此作为一个参考值（最终生成的刻度线数量可能与 count 不同），以便刻度划分更合理
      // 具体参考官方文档 https://d3js.org/d3-scale/linear#linear_nice
      .domain([0, d3.max(data, d => d.close)]).nice(6)
      // 设置值域范围
      // svg 元素的高度（减去留白区域）
      .range([height - marginBottom, marginTop]);

  /**
   *
   * 创建容器
   *
   */
  // 创建一个 <div> 元素作为两个 <svg> 的容器：
  // * 其中一个 svg 包含面积形状和横坐标轴（它进一步包裹在一个子容器 <div> 里，子容器可以在父元素里横向滚动，实现面积图的水平可滚动的效果）
  // * 另一个 svg 包含纵坐标轴
  // Create a div that holds two svg elements: one for the main chart and horizontal axis,
  // which moves as the user scrolls the content; the other for the vertical axis (which
  // doesn’t scroll).
  const parent = d3
    .select("#container")
    .append("div");


  /**
   *
   * 绘制坐标轴
   *
   */
  // 在父容器里创建一个 svg 用于绘制纵坐标轴
  parent.append("svg")
      .attr("width", width) // svg 宽度与页面宽度一致，所以该元素不会滚动
      .attr("height", height)
      .style("position", "absolute") // 采用 absolute 定位，然后通过属性 z-index 设置层叠顺序
      // 通过设置 CSS 属性 pointer-events 为 "none" 使该 svg 元素无法成为鼠标事件的目标
      // 即在该元素上的鼠标操作会穿透该元素，作用于其下方的元素，以便可以在纵坐标轴出也可以操作（左右平移）面积图
      .style("pointer-events", "none")
      .style("z-index", 1) // 该 svg 元素叠于另一个 svg 元素的上层
    .append("g") // 添加一个 <g> 元素作为纵坐标轴的容器
      // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
      .attr("transform", `translate(${marginLeft},0)`)
      // 纵轴是一个刻度值朝左的坐标轴
      // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
      .call(d3.axisLeft(y).ticks(6))
      // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
      .call(g => g.select(".domain").remove())
      // 为纵坐标轴添加标注信息
      // 选中最后一个刻度值，即 <text> 元素，并进行复制
      .call(g => g.select(".tick:last-of-type text").clone()
          .attr("x", 3) // 设置元素的偏移量
          .attr("text-anchor", "start") // 设置文字的对齐方式
          .attr("font-weight", "bold") // 设置字体粗细
          .text("$ Close")); // 设置文本内容

  // 创建一个可滚动的 <div> 元素作为子容器，包含面积形状和横坐标轴
  // Create a scrolling div containing the area shape and the horizontal axis.
  const scrollBody = parent.append("div")
      // 通过设置 CSS 的 overflow-x 属性为 scroll 允许该元素横向滚动
      .style("overflow-x", "scroll")
      // 通过设置 CSS 的 -webkit-overflow-scrolling 属性控制元素在移动设备上是否基于动量滚动
      // 将该属性值设置为 touch 使用基于动量的滚动，即手指从触摸屏上抬起，滚动会继续一小段时间
      // 具体参考相关文档 https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html#//apple_ref/css/property/-webkit-overflow-scrolling 和 https://developer.mozilla.org/ko/docs/orphaned/Web/CSS/-webkit-overflow-scrolling
      // ⚠️ 但这是非标准属性，不推荐在生产环境中使用，可能存在兼容问题
      .style("-webkit-overflow-scrolling", "touch");

  // 在子容器里创建一个 svg 用于绘制面积图和横坐标轴
  const svg = scrollBody.append("svg")
      .attr("width", totalWidth) // svg 宽度是页面宽度的 6 倍，所以该元素可以水平滚动
      .attr("height", height)
      .style("display", "block");

  // 添加一个 <g> 元素作为横坐标轴的容器
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    .call(d3.axisBottom(x)
          // 通过 axis.ticks(interval) 显式地设置坐标轴刻度应该如何生成（相隔多远生成一个刻度）
          // 基于 D3 内置的边距计算器 d3.utcMonth（以一个以月为间距的 interval），使用方法 interval.every(step) 对其进行定制
          // 这里 d3.utcMonth.every(1200 / width) 表示基于页面的宽度 width 调整采样的步长（原来的每个月进行采样生成横坐标轴的刻度），如果页面宽度 width 较小时 1200/width 就可能大于 1，则表示不是每个月采样，即可能间隔多个月才生成一条刻度线
          // 💡 以上方法可以更细致地控制刻度线的生成方式，也可以使用 axis.ticks(count) 的形式设置刻度数量的参考值（但是可能无法更好地适应页面的宽度）
          .ticks(d3.utcMonth.every(1200 / width))
          // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
          .tickSizeOuter(0));

  /**
   *
   * 绘制面积图内的面积形状
   *
   */
  // 使用 d3.area() 创建一个面积生成器
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = d3.area()
      // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveStep
      // 该插值效果是在两个数据点之间，生成阶梯形状的线段（作为面积图的边界）
      // 具体效果参考 https://d3js.org/d3-shape/curve#curveStep
      .curve(d3.curveStep)
      // 设置下边界线横坐标读取函数
      // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
      // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
      .x(d => x(d.date))
      // 设置下边界线的纵坐标的读取函数
      // 这里的面积图的下边界线是横坐标轴，所以它的 y 值始终是 0，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
      .y0(y(0))
      // 设置上边界线的纵坐标的读取函数
      .y1(d => y(d.close));

  // 将面积形状绘制到页面上
  svg.append("path") // 使用路径 <path> 元素绘制面积形状
      // 绑定数据
      .datum(data)
      // 将面积的填充颜色设置为蓝色
      .attr("fill", "steelblue")
      // 由于面积生成器并没有调用方法 area.context(canvasContext) 设置画布上下文
      // 所以调用面积生成器 area 返回的结果是字符串
      // 该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", area);

  // 使用 element.scrollBy(x-coord) 方法设置子容器滚动的初始值
  // 面积图的初始状态是滚动到最右侧
  // Initialize the scroll offset after yielding the chart to the DOM.
  scrollBody.node().scrollBy(totalWidth, 0);
});
