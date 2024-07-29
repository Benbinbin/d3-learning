// 参考自 https://observablehq.com/@d3/new-zealand-tourists-1921-2018

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
const marginLeft = 50;

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
// 数据来源网页 https://observablehq.com/@d3/new-zealand-tourists-1921-2018 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/18c42101272c5c631a74c9332c71cf14/raw/10d2b30beb5734663279d6cece6a57dcbdcbf02b/nz-tourists.csv";

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
    // 从数据集的每个数据点中提取出日期（时间）d.date，并用 d3.extent() 计算出它的范围
    .domain(d3.extent(data, d => d.date))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺（创建两个比例尺，一个是线性比例尺，一个是对数比例尺，支持用户切换）
  // 创建线性比例尺
  // 纵坐标轴的数据是连续型的数值（人数），可以选择线性比例尺，使用 d3.scaleLinear 构建
  const yLinear = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是人数的最大值
    // 通过 d3.max(data, d => d.value) 从数据集中获取人数的最大值
    // 然后再通过 continuousScale.nice() 编辑定义域的范围，通过四舍五入使其两端的值更「整齐」
    // 便于映射到值域的（刻度）值更具有可读性
    .domain([0, d3.max(data, d => d.value)]).nice()
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .rangeRound([height - marginBottom, marginTop]);

  // 创建对数比例尺
  // 纵坐标轴的数据是连续型的数值（人数），也可以对数比例尺，使用 d3.scaleLog 构建
  // 💡 对数比例尺可以在较小的空间中显示更大的数值范围
  // 具体可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#对数比例尺-log-scales
  const yLog = d3.scaleLog()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出人数 d.value，并用 d3.extent() 计算出它的范围
    .domain(d3.extent(data, d => d.value))
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .rangeRound([height - marginBottom, marginTop]);

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

  // 用于绘制纵坐标轴的方法，该函数接收三个参数
  // 第一个参数 g 是一个选择集（只包含一个 `<g>` 元素作为纵坐标轴的容器）
  // 第二参数 y 是比例尺，用于构建纵坐标轴
  // 第三个参数 format 是格式化说明符，用于设置坐标轴刻度值的格式
  const yAxis = (g, y, format) => g
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
    // 具体可以参考官方文档 https://d3js.org/d3-axis#axis_ticks
    // 第一个参数是一个数值，用于设置刻度数量（这里设置的是预期值，并不是最终值，D3 会基于出入的数量进行调整，以便刻度更可视）
    // 第二个参数是一个字符串，称为 specifier 格式化数字的说明符，用于设置刻度值格式（如果忽略该参数，则采用默认值的格式，采用浮点数和千位分隔符，即数字可以保留小数位，整数部分每达到千位以逗号
    // 关于数字格式化说明符 specifier 可以参考官方文档 https://d3js.org/d3-format
    .call(d3.axisLeft(y).ticks(height / 80, format))
    // 复制了一份刻度线，用以绘制图中横向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      .attr("stroke-opacity", 0.2) // 调小参考线的透明度
      // 调整复制后的刻度线的终点位置（往右移动）
      .attr("x2", width - marginLeft - marginRight))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的顶部（即容器的左上角）
      .attr("x", -marginLeft)
      .attr("y", 10)
      .attr("fill", "currentColor") // 设置文本的颜色
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .text("↑ Visitors per month")) // 设置文本内容
  // 💡 值得留意前面使用了方法 selection.call(func)
  // 💡 该方法会执行一次入参的函数 func，而且将选择集 selection 作为第一个入参传递给 func
  // 💡 这里传入的参数是坐标轴对象 axis
  // 💡 所以坐标轴对象实际上也是一个方法，接受一个 SVG 元素 context（一般只包含一个 <g> 元素），将坐标轴在其内部渲染出来
  // 💡 最后返回当前选择集，这样是为了便于后续进行链式调用
  // 💡 具体可以参考 https://github.com/d3/d3-selection#selection_call
  // 💡 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 在更新纵坐标轴时调用该方法，以实现坐标轴刻度的切换动效
  // 该函数接收两个参数
  // 第一个参数 g 实际上是一个过渡管理器（以下称为 transition）
  // 它和 selection 选择集类似，有相似的方法，例如使用 transition.selectAll(selector) 选中所有匹配的后代元素
  // 这里用 g 表示因为选择集中包含一个 `<g>` 元素，它是纵坐标轴的容器，在里面已经包含了所生成的坐标轴
  // 不同的是（在为选择集中的元素）所设置的属性值是过渡的**最终值/目标值**，然后自动在过渡过程中多次使用插值器，计算出起始值和目标值之间的过渡值，从而实现图形元素的某个可视化变量从起始值顺滑变换到目标值的效果
  // 关于过渡管理器 transition 的介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition
  // 第二个参数 y 是比例尺
  const yTickPosition = (g, y) => g.selectAll(".tick") // 选中所有刻度（包括刻度线和刻度值）
    // 💡 D3 为所生成的坐标轴的每个刻度元素（一个 <g> 元素，带有 `.tick` 类名）绑定了相应的数据，就是刻度值
    // 可以参考源码 https://github.com/d3/d3-axis/blob/main/src/axis.js#L53
    // 所以这里的入参 `d` 是每个刻度所对应的刻度值
    // 为了实现在切换比例尺时刻度也会随之「移动」的动效
    // 这里基于**新的比例尺 y** 重新计算当前所遍历的 `d` 值应该映射到图中哪个的位置
    // 另外需要考虑一个问题，即使用 yLinear 线性比例尺所绘制的坐标轴具有 0 刻度，它所绑定的值就是 0
    // 但如果比例尺切换到 yLog 时，如果将 0 作为参数 y(0) 返回的值是 NaN，不能作为 translate 的合法值
    // 对于这种情况，会采用回 yLinear 线性比例尺（而不是传递进来的比例尺 y，因为它是对数比例尺）计算出一个数值
    // ⚠️ 其实在这个场景，对于 0 采用不同的比例尺计算映射的位置，是不影响最后显示出来的纵坐标轴，因为从线性比例尺切换到对数比例尺时，axisLinear 最终会被隐藏掉
    .attr("transform", d => {
      // console.log({d, y: y(d)});
      return `translate(0,${(isNaN(y(d)) ? yLinear(d) : y(d)) + 0.5})`
    });

  // 创建一个容器，在其中绘制出纵坐标轴，采用的是线性比例尺
  // 由于在调用方法 yAxis 时没有传递第三个参数 format，所以坐标轴的刻度值采用默认的格式（浮点数和千位分隔符）
  // （方法 yAxis 的第一个参数，是通过方法 selection.call() 隐式传递了前面所创建的 <g> 容器）
  const axisLinear = svg.append("g")
    .style("opacity", 1) // 设置透明度，该坐标轴（容器）的初始状态是显示的
    .call(yAxis, yLinear);

  // 创建一个容器，在其中绘制出纵坐标轴，采用的是对数比例尺
  // 在调用方法 yAxis 时传递的第三个参数 `,` 将坐标轴的刻度值采用千位分隔符的格式
  const axisLog = svg.append("g")
    .style("opacity", 0) // 设置透明度，该坐标轴（容器）的初始状态是隐藏的
    .call(yAxis, yLog, ",")
    // 调整该坐标轴刻度的初始状态
    // 调用 yTickPosition 方法，将该（基于对数比例尺构建的）坐标轴的刻度按照 yLinear 比例尺重新进行计算
    // 待下一次切换时才会有刻度的切换动效
    .call(yTickPosition, yLinear);

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 用于创建线段生成器的方法，该函数接收一个参数 y 作为纵坐标轴的比例尺
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = y => d3.line()
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.date))
    // 设置纵坐标读取函数，使用该函数传递进来的参数 y 比例尺进行映射
    .y(d => y(d.value));

  // 将线段路径绘制到页面上
  const path = svg.append("path") // 使用路径 <path> 元素绘制折线
    // 绑定数据
    // 这里采用 selection.datum(value) 为选择集中的每个元素上绑定的数据（该选择集里只有一个 <path> 元素）
    // ⚠️ 它与 selection.data(value) 不同，该方法不会将数组进行「拆解」
    // 即这个方法不会进行数据与元素的一一链接计算，并且不影响索引，不影响（不产生）enter 和 exit 选择集
    // 而是将数据 value 作为一个整体绑定到选择的各个元素上，因此使用该方法选择集的所有 DOM 元素绑定的数据都一样
    // 具体参考官方文档 https://d3js.org/d3-selection/joining#selection_datum
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#绑定数据
    .datum(data)
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    .attr("stroke", "steelblue")
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round") // 设置折线之间的连接样式（圆角让连接更加平滑）
    .attr("stroke-linecap", "round") // 设置路径端点的样式
    // 由于线段生成器并没有调用方法 line.context(parentDOM) 设置画布上下文
    // 所以调用方法 line() 返回的结果是字符串（这里先采用 yLinear 线性比例尺绘制直线）
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line(yLinear));

  // 监听 <input type="radio"> 元素的 change 事件，更新折线图
  const radioButtons = document.querySelectorAll('input[type="radio"]');

  /**
   * 根据 yType 的值（纵坐标轴采用 yLinear 线性比例尺，还是选择 yLog 对数比例尺）更新折线图
   */
  radioButtons.forEach(radioButton => {
    radioButton.addEventListener('change', function (event) {
      if (this.checked) {
        const yType = this.value;
        // 根据 yType 的值选择不同的比例尺
        const y = yType === "linear" ? yLinear : yLog;
        // 在根元素上创建一个过渡管理器
        const t = svg.transition().duration(750);
        // 基于所选择的比例尺，通过设置 opacity 来隐藏/显示 axisLinear 和 axisLog 坐标轴
        // 通过 selection.transition(t) 设置过渡动效
        // 会基于传入的（已有）过渡管理器，创建一个同名同 id 的过渡管理器，这样可以方便地复用过渡动画的设置
        // 并且同时调用 yTickPosition 实现坐标轴刻度的切换动效（⚠️ 传入的比例尺都是 y 当前所选中的比例尺）
        axisLinear.transition(t).style("opacity", y === yLinear ? 1 : 0).call(yTickPosition, y);
        axisLog.transition(t).style("opacity", y === yLog ? 1 : 0).call(yTickPosition, y);
        // 基于所选择的比例尺 y 更新折线
        // 而且通过 selection.transition(t) 采用相同的过渡管理器设置动效
        path.transition(t).attr("d", line(y));
        // 最终的效果是坐标轴的隐藏/显示、刻度的切换，以及折线的变换同时进行
      }
    });
  });
});
