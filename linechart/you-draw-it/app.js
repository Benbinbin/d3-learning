// 参考自 https://observablehq.com/@d3/line-chart/2

/**
 *
 * 将核心代码封装为一个函数
 *
 */
function Drawer({
  svg, // svg 容器（一个仅包含一个 `<svg>` 元素的选择集）
  // margin 为前缀的参数
  // 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
  marginTop = 20, // 顶部空白区域的宽度（单位是像素）
  marginRight = 30, // 右侧空白区域的宽度（单位是像素）
  marginBottom = 30, // 底部空白区域的宽度（单位是像素）
  marginLeft = 40, // 左侧空白区域的宽度（单位是像素）
  width = 640, // svg 元素的宽
  height = 400, // svg 元素的高
  xSamples = 30, // 数据点的采样数量（近似值，实际上是用于设置横坐标轴的刻度数量）
  // 横坐标轴所使用的比例尺
  xType = d3.scaleUtc,
  // 横坐标的定义域范围 [xmin, xmax]
  xDomain = [new Date("2022-01-01"), new Date("2023-01-01")],
  // 横坐标的值域范围（所映射的可视元素）[left, right]
  xRange = [marginLeft, width - marginRight],
  // 纵坐标轴所使用的比例尺
  yType = d3.scaleLinear,
  // 纵坐标的定义域范围 [ymin, ymax]
  yDomain = [0, 1],
  // 坐标的值域范围（所映射的可视元素）[bottom, top]
  // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围是 [bottom, top]
  // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
  // 所以这里的值域范围需要采用从下往上与定义域进行映射
  yRange = [height - marginBottom, marginTop],
  yFormat, // 格式化数字的说明符 specifier 用于格式化纵坐标轴的刻度值
  yLabel, // 纵坐标轴的注释，为纵坐标轴添加额外文本
  // 设置曲线插值器插值器
  // 它被用于在两个数据点之间进行插值（生成一系列的模拟点），以定义了两个离散点之间的连线如何生成
  // 不同的插值器对应不同的连线方式，默认使用 `d3.curveLinear` 它会在两个相邻的离散点之间以直连的方式生成线段
  curve = d3.curveLinear,
} = {}) {

  // 用一个数组来容纳数据点
  let data = [];

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是月份（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，处于不同时区的用户也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time 或 https://github.com/d3/d3-scale#time-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const xScale = xType(xDomain, xRange);
  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是 [0, 1] 的连续型的数值，，使用 d3.scaleLinear 构建一个线性比例尺
  const yScale = yType(yDomain, yRange);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 横轴是一个刻度值朝下的坐标轴
  // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
  // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks
  // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
  const xAxis = d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0);

  // 纵轴是一个刻度值朝左的坐标轴
  // 通过 axis.ticks(count, format) 设置刻度数量（参考值）和刻度值格式
  // 第二个参数 format 应该是一个字符串，称为 specifier 格式化说明符，用于设置刻度值格式（由于纵坐标轴采用线性比例尺，所以应该采用数值格式说明符）
  // 而在这个实例中 yFormat 的值是 undefined，则采用比例尺自动生成的默认格式
  // 关于 D3 所提供的数值格式具体参考官方文档 https://github.com/d3/d3-format
  const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);

  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(xAxis);
  // 💡 注意这里使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    .call(yAxis)
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中横向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      // 调整复制后的刻度线的终点位置（往右移动）
      .attr("x2", width - marginLeft - marginRight)
      .attr("stroke-opacity", 0.1)) // 调小参考线的透明度
    // 为坐标轴添加额外注释信息（一般是坐标轴名称或刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的顶部（即容器的左上角）
      .attr("x", -marginLeft)
      .attr("y", 10)
      .attr("fill", "currentColor") // 设置文本的颜色
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .text(yLabel)); // 设置文本内容

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 设置两点之间的曲线插值器（所以线段生成器除了可以绘制折线，还可以绘制曲线）
    // D3 提供了一系列的内置的曲线插值器，它们的区别和具体效果可以查看官方文档 https://d3js.org/d3-shape/curve
    // 这里采用默认值 `d3.curveLinear` 它会在两个相邻的离散点之间以直连的方式生成线段
    // 所以其效果和普通的折线图一样
    .curve(curve)
    // 调用线段生成器方法 line.defined() 设置数据完整性检验函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
    // 该函数也是有三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
    // 当函数返回 true 时，线段线段生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
    // 当函数返回 false 时，该元素就会就会跳过，当前线段就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一段段分离的线段
    // 这里通过判断数据点（一个二元数组）的第二个元素 y 是否为 null 来判定该数据是否缺失
    .defined(([, y]) => y != null)
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里解构出数据点（一个二元数组）的第一个元素 x，基于它并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(([x]) => xScale(x))
    // 设置纵坐标读取函数
    // 这里解构出数据点（一个二元数组）的第二个元素 y，基于它并采用比例尺 y 进行映射，计算出相应的纵坐标
    .y(([, y]) => yScale(y));

  // 设置折线图路径的样式
  const path = svg.append("path") // 使用路径 <path> 元素绘制折线
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    .attr("stroke", "black") // 设置描边颜色
    .attr("stroke-width", 1.5); // 设置描边宽度

  /**
   *
   * 交互
   *
   */
  // 创建一个 <rect> 矩形，它的大小与 svg 元素一样大
  // 可以将它理解为一个覆盖在折线图上面的透明蒙版，在它上面监控用户的拖拽行为，以实现交互操作
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    // 这里在折线图上面再添加一个「不可见」的矩形
    // 所以这里将填充 fill 设置为 none
    .attr("fill", "none")
    // ⚠️ 由于属性 fill 设置为 none 的 SVG 元素无法成为鼠标事件的目标
    // 需要将 pointer-events 设置为 all 进行「校正」，则该元素在任何情况下（无论属性 fill 设置为任何值）都可以响应指针事件
    .attr("pointer-events", "all")
    // 通过 d3.drag() 创建一个拖拽器（以下称为 `drag`）
    // D3 提供了一个模块 d3-drag 实现拖拽相关的交互，具体参考官方文档 https://d3js.org/d3-drag
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-interact#拖拽
    // 拖拽器是一个方法，它可以接收选择集作为参数 `drag(selection)`，为选择集中的元素添加相应的拖拽事件监听器
    // 所以一般通过 selection.call(d3.drag()) 方法调用拖拽器创建函数
    // 这样 selection 选择集就会作为参数传递给拖拽器创建函数
    .call(d3.drag()
      // 使用方法 drag.on(typenames, [listener]) 监听拖拽事件 typenames，并执行回调函数 listener
      // 第一个参数 typenames 可以是 D3 提供了 3 种拖拽相关的自定义事件类型之一：start（拖拽开始时分发）、drag（拖拽进行中不断分发）、end（拖拽结束时分发）
      // 第二个参数 listener 是事件处理函数，它依次接收 2 个参数：event 拖拽事件对象，d 当前被拖拽的元素所绑定的数据 datum
      // 在事件处理函数内的 this 指向当前的元素，即 `<rect>` 矩形元素
      // 这里分别监听 `start` 和 `drag` 事件
      // 在拖拽开始时执行函数 dragstarted，而在拖拽期间不断执行函数 dragged 这些函数的具体实现和解读 👇 看下面
      .on("start", dragstarted)
      .on("drag", dragged));

  // 在拖拽开始时执行函数 dragstarted
  // 初始化 <path> 路径元素所绑定的数据
  // 并触发函数 dragged（创建第一个数据点）
  function dragstarted() {
    // 使用比例尺的方法 xScale.ticks(count) 获取它对横坐标定义域范围的采样结果
    // 返回结果是一个数组（作为刻度），其中元素的数量（刻度线的数量）是基于参数 count 进行调整的，以保证刻度的可读性
    // 具体介绍可以参考官方文档 https://d3js.org/d3-scale/linear#linear_ticks
    // 然后对数组进行遍历，将它的每个元素 x 转换为 `[x, null]` 二元数组的形式
    // 💡 进行如此转换是因为二元数组的格式和数据点的横纵坐标值相兼容（数据点的 x 值来源/约束在于横坐标轴的刻度值，它是已知的；而 y 值由用户绘制生成，它是未知的，所以用 null 来替代/占位）
    // 所以 path 所绑定的数据
    data = xScale.ticks(xSamples).map(x => [x, null]);

    // 为 <path> 元素（path 选择集中只有它一个元素）绑定数据
    // 这里采用 selection.datum(value) 为选择集中的每个元素上绑定的数据（该选择集里只有一个 <path> 元素）
    // ⚠️ 它与 selection.data(data) 不同，该方法不会将数组进行「拆解」，即这个方法不会进行数据链接计算并且不影响索引，不影响（不产生）enter 和 exit 选择集，而是将数据 value 作为一个整体绑定到选择的各个元素上，因此使用该方法选择集的所有 DOM 元素绑定的数据都一样
    // 具体参考官方文档 https://d3js.org/d3-selection/joining#selection_datum 或 https://github.com/d3/d3-selection/tree/main#selection_datum
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#绑定数据
    path.datum(data);

    // 这里手动触发函数 dragged 这样就可以在按下鼠标时就创建一个数据点（作为折线的起始点）
    // 因为如果等到（拖拽）鼠标移动时才开始创建数据点，折线的起始点可能就不在按下鼠标的地方，看起来就像是鼠标定位飘了 ❓
    // 通过 func.call(context) 的形式来调用，以修改/设定它的上下文
    // 将函数 dragged 的 this 指向当前函数的 this（当前回调函数的 this 是指向触发 `start` 事件的触发元素 `<rect>` 矩形）
    dragged.call(this);
  }

  // 使用方法 d3.bisector(accessor) 创建一个数组分割器 bisector，它会基于特定值，将（有序）的数组里的元素一分为二
  // 参数 accessor 是访问函数，在调用分割器对数组进行分割时，数组的每个元素都调用该访问函数，将返回值用于分割/比较时该元素的代表值
  // bisector.center 将分割的标准设置为「临近分割」
  // 关于分割器的介绍参考官方文档 https://d3js.org/d3-array/bisect#bisector
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#二元分割
  // 这里对遍历的元素（一个二元数组）进行解构，基于它的第一个元素（它是横坐标值，时间）来比较
  const bisectX = d3.bisector(([x]) => x).center;

  // 在拖拽期间不断执行函数 dragged
  // 该函数的参数是拖拽事件对象 event，这里对其进行解构 {x, y} 以得到拖拽目标（相对于其父容器，即 <svg> 元素）的横纵坐标
  // 在这个实例中从视觉上没有看到拖拽的元素（因为拖拽的是隐形的 <rect> 元素），就可以理解为鼠标的横纵坐标值
  function dragged({ x, y }) {
    // 通过比例尺的方法 `scale.invert()` 基于坐标值（值域的值），反过来得到定义域的相应值
    const dx = xScale.invert(x);
    const dy = yScale.invert(y);

    // ⚠️ 但是并不会将每次捕获所得的鼠标坐标点都直接拿来绘制折线图（否则会让折线图看起来就和鼠标轨迹一样，小的曲曲折折特别多，而且波动/抖动频率很高 ❓ ），需要先对横坐标进行处理，以确保创建/修改的数据点都约束在横坐标轴的刻度线上
    // 基于鼠标所对应的横坐标值 dx 对数据 data（一个有序的数组，包含了横坐标轴的刻度值）进行二元分割
    // 返回值 i 是 data 数组的索引值，表示如果 dx  插入到该位置，依然保持数组有序
    // 也可以理解为数组的第 i 个元素 data[i] 与 dx 值最接近
    let i = bisectX(data, dx);

    // 修改 data 的第 i 个元素，它是一个二元数组，其第二个元素表示当前数据点的 y 值，将其设置为鼠标的纵坐标值 dy
    data[i][1] = dy;

    // 假如用户的鼠标从横坐标的开头快速拖拽到结尾以绘制折线，但是速度过快而 drag 事件分发的速度可能跟不上，则会出现折线断连的情况（由于 data 数组中间的一些元素的 y 值没有被修改，依然是 null）
    // 修补正好出现在鼠标所在位置（第 i 个元素）前面的一段折线「缺口」 （从左往右快速拖拽绘制折线时）
    // 从索引值 i-1 开始向前遍历 data 的元素
    for (let k = i - 1; k >= 0; --k) {
      // 当遇到第一个 data[k][1] 不为 null（即这个第 k 个元素具有 y 值），进入「修补」程序
      // 即从第 k+1 到第 i-1 个元素都是缺少 y 值的
      if (data[k][1] != null) {
        // 循环遍历第 k+1 个元素到第 i-1 个元素，将它们的 y 值都设置为 dy（假定与当前第 i 个元素的纵坐标一致）
        // 其效果就是直接用一条水平直线来填补缺口
        while (++k < i) data[k][1] = dy;
        // 修补完成后跳出循环
        break;
      }
    }
    // 修补正好出现在鼠标所在位置（第 i 个元素）后面的一段折线「缺口」 （从右往左快速拖拽绘制折线时）
    for (let k = i + 1; k < data.length; ++k) {
      if (data[k][1] != null) {
        while (--k > i) data[k][1] = dy;
        break;
      }
    }

    // 最后（用更新后的数据）重新绘制折线
    // 调用线段生成器 line
    // 将其返回的结果（字符串）作为 `<path>` 元素的属性 `d` 的值
    path.attr("d", line);
  }
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

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

// 调用核心函数绘制出折线图
Drawer({
  svg,
  height,
  width,
  xSamples: width / 60,
  yLabel: "↑ Intensity"
})