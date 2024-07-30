// 参考自 https://observablehq.com/@d3/focus-context

/**
 *
 * 构建 svg
 *
 */

const mainContainer = document.getElementById("mainContainer"); // 主图的容器
const minimapContainer = document.getElementById("minimapContainer"); // 缩略图的容器

// 获取尺寸大小
const width = mainContainer.clientWidth; // 宽度
const height = 440; // svg 元素的高，作为主面积图的高

const focusWidth = minimapContainer.clientWidth; // svg 元素的高，作为缩略图的高
const focusHeight = 100; // svg 元素的高，作为缩略图的高
// margin 的作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const margin = ({top: 20, right: 20, bottom: 30, left: 40})

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/focus-context 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/61a819373d0eada06b7966a560aafc7e/raw/979711fba712b0263309234239bfbd144a8a3edc/aapl.csv";

d3.csv(dataURL, d3.autoType).then((aapl) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(aapl);

  // 对数据集进行转换
  const data = aapl.map(({date, close}) => ({date, value: close}));

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
    .range([margin.left, width - margin.right]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（股价），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是股价的最高值
    // 通过 d3.max(data, d => d.value) 从数据集中获取股价的最大值
    .domain([0, d3.max(data, d => d.value)])
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([height - margin.bottom, margin.top]);

  /**
   *
   * 构建坐标轴
   *
   */
  // 变量 xAxis 是一个函数，它接受三个参数，用以绘制横坐标轴
  // * g 是容器元素（横坐标轴在该元素里渲染）
  // * x 是横坐标比例尺
  // * height 是 svg 的高度
  // 💡 该函数最终返回一个横坐标轴对象
  const xAxis = (g, x, height) => g
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - margin.bottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));
    // 通过 selection.call(axis) 的方式来调用坐标轴对象（它也是一个函数）
    // 会将选择集（只包含一个元素 <g>）传递给函数，作为第一个参数
    // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
    // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 变量 yAxis 是一个函数，它接受三个参数，用以绘制纵坐标轴
  // * g 是容器元素（纵坐标轴在该元素里渲染）
  // * y 是纵坐标比例尺
  // * title 是纵坐标轴的标注信息
  // 💡 该函数最终返回一个纵坐标轴对象
  const yAxis = (g, y, title) => g
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${margin.left},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g =>
      // 返回一个选择集，其中虚拟/占位元素是一系列的带有 CSS class ".title" 类名的 `<text>` 元素
      // 其实这里的选择器可以直接使用 g.selectAll()，因为后面也会为 `<text>` 元素设置 CSS 类名
      g.selectAll(".title")
        // 绑定数据，每个元素对应一个数据
        // 这里绑定的数据集（数组）为 [title] 只有一个元素
        .data([title])
        // 将这些 `<text>` 元素绘制到页面上
        // 由于所绑定的数据只有一个数据点，所以相应地在页面只添加一个 `<text>` 元素
        .join("text")
        // 为该元素设置 CSS class ".title" 类名
        .attr("class", "title")
        // 将该文本移动到坐标轴的顶部（即容器的左上角）
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor") // 设置文本的颜色
        .attr("text-anchor", "start") // 设置文本的对齐方式
        .text(title)) // 设置文本内容

  /**
   *
   * 构建面积图
   *
   */
  // 变量 area 是一个函数，它接受两个参数
  // * x 是横坐标比例尺
  // * y 是纵坐标比例尺
  // 💡 该函数最终返回一个面积生成器
  // 使用 d3.area() 创建一个面积生成器
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  area = (x, y) => d3.area()
    // 💡 调用面积生成器方法 area.defined() 设置数据完整性检验函数
    // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
    // 该函数传入三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
    // 当函数返回 true 时，面积生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
    // 当函数返回 false 时，该元素就会就会跳过，当前面积就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一个个分离的面积区块
    // 这里通过判断数据点的属性 d.value（收盘价）是否为 NaN 来判定该数据是否缺失
    .defined(d => !isNaN(d.value))
    // 设置下边界线横坐标读取函数
    // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.date))
    // 设置下边界线的纵坐标的读取函数
    // 这里的面积图的下边界线是横坐标轴，所以它的 y 值始终是 0，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
    .y0(y(0))
    // 设置上边界线的纵坐标的读取函数
    .y1(d => y(d.value));

  /**
   *
   * 缩略图
   *
   */
  // 创建 svg
  // 在容器 <div id="container"> 元素内创建一个 SVG 元素
  // 返回一个选择集，只有 svg 一个元素
  const minimapSvg = d3
    .select("#minimapContainer")
    .append("svg")
    .attr("viewBox", [0, 0, width, focusHeight])
    .style("display", "block");

  // 绘制横坐标轴
  minimapSvg.append("g")
  .call(xAxis, x, focusHeight);

  // 将面积形状绘制到页面上
  minimapSvg.append("path")
    .datum(data) // 绑定数据
    .attr("fill", "steelblue") // 将面积的填充颜色设置为蓝色
    // 使用方法 area(x, y) 创建一个面积生成器 areaGenerator，第一个参数是横坐标比例尺，第二个参数纵坐标比例尺
    // 再调用（自动传入选择集所绑定的数据）areaGenerator(data) 绘制面积形状
    // ⚠️ 由于比例尺 y 的值域采用主图的尺寸，所以需要进行调整
    // 这里使用方法 continuous.copy() 创建一个比例尺 y 的副本，然后再对该副本进行修改，并不影响原来的比例尺对象
    // 由于面积生成器并没有调用方法 area.context(parentDOM) 设置画布上下文
    // 所以调用面积生成器 area(aapl) 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", area(x, y.copy().range([focusHeight - margin.bottom, 4])));

  // 刷选
  // 创建一个 X 轴刷选器
  const brush = d3.brushX()
    // 设置可刷选区域，即缩略图的面积形状区域（将 svg 减去留白的区域）
    // 刷选器会在该区域创建一个 <rect class="overlay" ...> 元素作为覆盖层，响应用户的刷选操作
    .extent([[margin.left, 0.5], [width - margin.right, focusHeight - margin.bottom + 0.5]])
    // 监听刷选过程中（如鼠标移动操作）所触发的事件，触发回调函数 brushed
    .on("brush", brushed)
    // 监听刷选结束时（如松开按键操作）所触发的事件，触发回调函数 brushended
    .on("end", brushended);

  // 设置默认的选区
  // 使用 d3.utcYear 创建一个以年为间距的 interval，通过 interval.offset(date, step) 对入参的时间 date 进行偏移处理
  // 关于时距器的介绍可以参考官方文档 https://d3js.org/d3-time#interval_offset
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间修约
  // 这里入参的时间是 x.domain()[-1] 横坐标轴比例尺的定义域的上界（数据集中的最后一年，即 2012 年）
  // 然后 step=-1 表示向前调整一年，即 2011 年，再使用比例尺 x 进行映射，计算出选区的左侧端点
  // 而选区的右侧端点，采用比例尺 x 的值域上界 x.range()[1]，即横坐标轴的最右端
  // 所以默认选区是横跨最后一年
  const defaultSelection = [x(d3.utcYear.offset(x.domain()[1], -1)), x.range()[1]];

  // 创建一个容器
  const gb = minimapSvg.append("g")
    .call(brush) // 将前面所创建的刷选器绑定到容器上
    .call(brush.move, defaultSelection); // 操作刷选区，设置为默认选区

  // 刷选发生时所触发的回调函数
  // 从入参的刷选事件对象中解构出 selection 选区属性
  function brushed({selection}) {
    // 如果用户创建了选区
    if (selection) {
      // 选区 selection 是一个二元数组，其形式为 [x0, x1]，其中 x0, x1 分别表示选区两端的横坐标值
      // 然后使用 JS 原生方法 array.map(callbackFn, thisArg) 对数组的元素进行转换
      // 通过 continue.invert(value) 将给定的值域的值 value（像素），反过来得到定义域的值（日期）
      // 💡 基于选区位置反过来求出的日期并不正好是一天的开始，但是原始数据集中日期都是按天计算的，可以进行修约处理（其实也没有必要 ❓ 由于面积图是连续型的）
      // 再使用 d3.utcDay 创建一个以天为间隔的 interval，通过 interval.round 对日期进行修约
      // 为 minimapSvg 选择集中的元素（只包含一个 <svg> 元素）添加名为 value 的属性，如果选区为空，则该属性值为 [] 空数组；如果创建了选区，则该属性值为一个二元数组，表示选区两端所对应的日期
      minimapSvg.property("value", selection.map(x.invert, x).map(d3.utcDay.round));
    }
  }

  // 刷选结束时所触发的回调函数
  // 从入参的刷选事件对象中解构出 selection 选区属性
  function brushended({selection}) {
    // 如果用户没有创建选区，例如单击（而不是刷选）缩略图
    if (!selection) {
      // 则将选区设置回默认选区
      gb.call(brush.move, defaultSelection);
    }
  }

  /**
   *
   * 主图
   *
   */
  const mainSvg = d3
    .select("#mainContainer")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
});
