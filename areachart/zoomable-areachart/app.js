// 参考自 https://observablehq.com/@d3/zoomable-area-chart

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
const marginRight = 30;
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

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/zoomable-area-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/67028502b64dcdc17739d44154c883cb/raw/992ab81ed14e96ece84da56574b08297c77f3540/flights.csv";

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
  const x = d3.scaleUtc()
      // 设置定义域范围
      // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
      .domain(d3.extent(data, d => d.date))
      // 设置值域范围（所映射的可视元素）
      // svg 元素的宽度（减去留白区域）
      .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（航班次数），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
  // 设置定义域范围
  // [0, ymax] 其中 ymax 是航班次数的最大值
  // 通过 d3.max(data, d => d.value) 从数据集中获取航班次数的最大值
  // 并使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
  // 具体参考官方文档 https://github.com/d3/d3-scale#continuous_nice
  .domain([0, d3.max(data, d => d.value)]).nice()
  // 设置值域范围
  // svg 元素的高度（减去留白区域）
  .range([height - marginBottom, marginTop]);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 变量 xAxis 是一个函数，它接受两个参数
  // * g 是容器元素（横坐标轴在该元素里渲染）
  // * x 是横坐标比例尺
  // 💡 该函数最终返回一个横坐标轴对象
  // 💡 在初始化时（或缩放时），调用该函数以绘制（或更新）横坐标轴
  const xAxis = (g, x) => g
      // 横轴是一个刻度值朝下的坐标轴
      // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
      // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))

  // 绘制横坐标轴
  // 变量 gx 是一个选择集，里面包含一个元素 <g>，它是横坐标轴的容器
  const gx = svg.append("g")
      // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
      .attr("transform", `translate(0,${height - marginBottom})`)
      // 通过 selection.call(axis) 的方式来调用函数
      // 会将选择集中的元素 <g> 传递给函数，作为第一个参数
      // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
      // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法
      .call(xAxis, x);

  // 绘制纵坐标轴
  svg.append("g")
      // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
      .attr("transform", `translate(${marginLeft},0)`)
      // 纵轴是一个刻度值朝左的坐标轴
      // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
      // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks
      // 其中第一个参数用于设置刻度数量，这里设置为 `null` 表示采用（由刻度生成器所生成的）默认的数量
      // 而第二个参数用于设置刻度值格式，这里设置为 "s" 表示数值采用 SI-prefix 国际单位制词头，例如 k 表示千，M 表示百万
      // 具体参考 https://en.wikipedia.org/wiki/Metric_prefix
      // 关于 D3 所提供的数值格式具体参考官方文档 https://github.com/d3/d3-format
      .call(d3.axisLeft(y).ticks(null, "s"))
      // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
      .call(g => g.select(".domain").remove())
      // 为纵坐标轴添加标注信息
      // 并选中最后一个刻度值，即 <text> 元素，进行复制
      .call(g => g.select(".tick:last-of-type text").clone()
          .attr("x", 3) // 设置元素的偏移量
          .attr("text-anchor", "start") // 设置文字的对齐方式
          .attr("font-weight", "bold") // 设置字体大小
          .text("Flights")); // 设置文本内容

            /**
   *
   * 绘制面积图内的面积形状
   *
   */
  // 变量 area 是一个函数，它接受两个参数
  // * data 数据集（用于绘制面积图）
  // * x 横坐标比例尺
  // 💡 该函数会使用更新后的横坐标比例尺 x 构建面积生成器
  // 💡 然后调用该面积生成器（传递数据集 data）最终返回的结果是字符串，可作为 `<path>` 元素的属性 `d` 的值
  // 💡 在初始化时（或缩放时），调用该函数以绘制（或更新）面积形状
  // 使用 d3.area() 创建一个面积生成器
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = (data, x) => d3.area()
  // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveStepAfter
  // 该插值效果是在两个数据点之间，生成阶梯形状的线段（作为面积图的边界）
  // 具体效果参考 https://d3js.org/d3-shape/curve#curveStepAfter
  .curve(d3.curveStepAfter)
  // 设置下边界线横坐标读取函数
  // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
  // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
  .x(d => x(d.date))
  // 设置下边界线的纵坐标的读取函数
  // 这里的面积图的下边界线是横坐标轴，所以它的 y 值始终是 0，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
  .y0(y(0))
  // 设置上边界线的纵坐标的读取函数
  .y1(d => y(d.value))
// 调用面积生成器（传递数据集 data）
// 由于最之前面积生成器并没有调用方法 area.context(parentDOM) 设置画布上下文
// 所以调用面积生成器 area(aapl) 返回的结果是字符串
// 该值作为 `<path>` 元素的属性 `d` 的值
(data);

// 创建一个 identifier 唯一标识符（字符串）
// 它会作为一些 <clipPath> 元素的 id 属性值（方便其他元素基于 id 来使用），以避免与其他元素发生冲突
// 💡 在参考的 Observable Notebook 使用了平台的标准库所提供的方法 DOM.uid(namespace) 创建一个唯一 ID 号
// 💡 具体参考官方文档 https://observablehq.com/documentation/misc/standard-library#dom-uid-name
// 💡 方法 DOM.uid() 的具体实现可参考源码 https://github.com/observablehq/stdlib/blob/main/src/dom/uid.js
// const clip = DOM.uid("clip");
// 这里使用硬编码（手动指定）id 值
const clipId = "clipId";

// 创建一个元素 <clipPath> （一般具有属性 id 以便被其他元素引用）路径剪裁遮罩，其作用充当一层剪贴蒙版，具体形状由其包含的元素决定
// 💡 它不会直接在页面渲染出图形，而是被其他元素（通过设置属性 clip-path）引用的方式来起作用，为其他元素自定义了视口
// 这里在 <clipPath> 内部添加了一个 <rect> 设置剪裁路径的形状，以约束面积图容器的可视区域
// 则放大面积图时，超出其容器的部分就不会显示（避免遮挡坐标轴）
svg.append("clipPath")
  // 为 <clipPath> 设置属性 id
  .attr("id", clipId)
// 在其中添加 <rect> 子元素，以设置剪切路径的形状
.append("rect")
  // 设置矩形的定位和尺寸
  .attr("x", marginLeft) // 设置该元素的左上角的横坐标值（距离 svg 左侧 marginLeft 个像素大小）
  .attr("y", marginTop) // 设置该元素的左上角的纵坐标值（距离 svg 顶部 marginTop 个像素大小）
  .attr("width", width - marginLeft - marginRight) // 设置宽度（采用 svg 的宽度，并减去左右留白区域）
  .attr("height", height - marginTop - marginBottom); // 设置宽度（采用 svg 的高度，并减去上下留白区域）

// 将面积形状绘制到页面上
// 变量 path 是一个选择集，里面包含一个元素 <path>，它是绘制面积形状的元素
const path = svg.append("path") // 使用路径 <path> 元素绘制面积形状
  // 设置属性 clip-path 以采用前面预设的 <clipPath> 元素对图形进行裁剪/约束
  .attr("clip-path", clipId)
  .attr("fill", "steelblue") // 将面积的填充颜色设置为蓝色
  // 调用函数 area(data, x) 返回的结果是字符串，作为 `<path>` 元素的属性 `d` 的值
  .attr("d", area(data, x));

  /**
   *
   * 缩放交互
   *
   */
  // 缩放事件的回调函数
  // 当缩放时，需要更新横坐标轴比例尺，并重绘面积图
  // 其中参数 event 是 D3 的缩放事件对象
  // 该缩放事件对象的属性 transform 包含当前的缩放变换值，还提供一些方法用于操作缩放
  function zoomed(event) {
    // 调用方法 transform.rescaleX(x) 更新横轴轴比例尺
    // 返回一个定义域经过缩放变换的比例尺（这样映射关系就会相应的改变，会考虑上缩放变换对象 transform 的缩放比例）
    // 💡 关于方法 transform.rescaleX(x) 的介绍可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-interact#缩放变换对象的方法
    const xz = event.transform.rescaleX(x);
    // 调用函数 area(data, xz) 返回的结果是字符串，更新变量 path（它是一个选择集，里面包含一个 <path> 元素）的属性 d
    // 其中参数 xz 是更新后的的横坐标比例尺
    path.attr("d", area(data, xz));
    // 使用新的比例尺重新绘制横坐标轴
    gx.call(xAxis, xz);
  }

  // 创建缩放器
  const zoom = d3.zoom()
      // 约束缩放比例的范围，默认值是 [0, ∞]
      // 入参是一个数组 [1, 32] 表示最小的缩放比例是 1 倍，最大的缩放比例是 8 倍
      .scaleExtent([1, 32])
      // 缩放器除了可以缩放，还可以进行平移，以下两个方法分别设置与平移相关参数
      // 设置视图范围 viewport extent
      // 入参是一个嵌套数组，第一个元素是面积图的矩形区域的左上角，第二个元素是右下角
      // 如果缩放器绑定的是 svg，则视图范围 viewport extent 默认是 viewBox
      // 这里「校正」为用于绘制面积图的区域大小（不包含 margin 的区域）
      .extent([[marginLeft, 0], [width - marginRight, height]])
      // 约束平移的范围 translate extent，默认值是 [[-∞, -∞], [+∞, +∞]]
      // 这里设置平移的范围：最左侧为面积图的左边；最右侧为面积图的右边（最上方和最下方的范围虽然是无限的，但是这里只会进行水平缩放，所以也只可能进行水平移动，并不能进行上下移动）
      // 所以即使放大后，画布也只能在面积图的最左边和最右边之间来回移动
      .translateExtent([[marginLeft, -Infinity], [width - marginRight, Infinity]])
      .on("zoom", zoomed); // 缩放事件的回调函数
      // 🔎 以上提及的视图范围 viewport extent 和平移范围 translate extent 这两个概念，具体可以查看 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-interact

  // 为 svg 添加缩放事件监听器
  svg.call(zoom)
    // 通过 selection.transition() 创建过渡管理器
    // 💡 这样（从无缩放状态）切换到初始缩放状态时，就可以有过渡动效
    .transition()
      .duration(750) // 设置过渡持续时间
      // 设置初始缩放状态
      // 💡 transition.call(function[, arguments…]) 执行一次函数 function 它其实和ff selection.call() 方法类似
      // 💡 而且将过渡管理器作为第一个入参传递给 function，而其他传入的参数 arguments... 同样传给 function
      // 💡 最后返回当前过渡管理器，这样是为了便于后续进行链式调用
      // 具体参考官方文档 https://d3js.org/d3-transition/control-flow#transition_call
      // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#过渡参数配置
      // 使用方法 zoom.scaleTo(selection, k[, p]) 对选择集的元素进行缩放操作，并将缩放比例设置为 k
      // 第三个参数 p 是构建平滑的缩放过渡的参照点，默认为视图的中点，该参考点在缩放过程中不会发生移动
      // 这里将初始状态设置为放大 4 倍，过渡参考点是设置为横坐标轴上的一个点（日期 Date.UTC(2001, 8, 1) 所对应的位置），也是靠近中间的位置
      .call(zoom.scaleTo, 4, [x(Date.UTC(2001, 8, 1)), 0]);
});
