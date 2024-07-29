// 参考自 https://observablehq.com/@benbinbin/gradient-encoding

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
// 数据来源网页 https://observablehq.com/@benbinbin/gradient-encoding 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/9d2b7459bd33f2baf1457ecfc983534c/raw/8926c7f07473a597b93448f02c3bf4537c5aa6db/temperature.csv";

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
  // 为不同的温度值设置不同的配色
  // 使用 d3.scaleSequential 构建一个顺序比例尺 Sequential Scales 将连续型的定义域映射到连续型的值域
  // 它和线性比例尺类似，但是它的配置方式并不相同，通过会指定一个插值器 interpolator 作为值域
  // 具体参考官方文档 https://d3js.org/d3-scale/sequential 或 https://github.com/d3/d3-scale/tree/main#sequential-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#顺序比例尺-sequential-scales
  // 以下创建顺序比例尺时，同时设置了定义域与值域（插值器）
  // 其中定义域采用纵坐标轴比例尺的定义域（即数据集中温度值的范围）
  // 而插值器是 D3 的内置配色方案 d3.interpolateTurbo 可以从连续型的彩虹色中进行颜色「采样」
  // 具体可以查看 https://d3js.org/d3-scale-chromatic/sequential#interpolateTurbo
  const color = d3.scaleSequential(y.domain(), d3.interpolateTurbo);

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
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
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
    .call(g => g.select(".tick:last-of-type text").append("tspan").text("°F"));

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
      .attr("y1", height - marginBottom) // 渐变色的起始点的纵坐标
      .attr("x2", 0) // 渐变色的终止点的横坐标
      .attr("y2", marginTop) // 渐变色的终止点的纵坐标
      // 这里设置起始点和终止点的横坐标都是 0，由于渐变色是沿纵坐标轴变化的（以显示温度的变化），所以横坐标采用 0 即可
      // ⚠️ 注意 svg 的坐标体系中向下是正方向，所以渐变色的起始点 (0, height-marginBottom) 是在 y 轴的底部，终止点 (0, marginTop) 是在 y 轴的顶部
    // 进行二次选择，在元素 <linearGradient> 内添加一系列的 <stop> 元素，以切换渐变色
    .selectAll("stop")
      // 绑定数据
      // 使用方法 d3.ticks(start, stop, count) 根据 count 数量对特定范围（由 start 和 stop 指定）进行均分
      // 返回一个包含一系列分隔值的数组（一般作刻度值）
      .data(d3.ticks(0, 1, 10))
      // ⚠️ 注意这里所绑定的数据并不是原始数据集 data，而是构建出来的从 0 到 1，共 11 个元素的等差数列
      // 由于渐变色随纵坐标轴的值变化（而不是随时间变化，而数据点是随时间变化的，所以不是绑定原始数据集）
      // 这里构建出来数组（从 0 到 1 的等差数列），每个元素表示一个百分比，即相对于 y 轴的位置（偏移量）
    .join("stop")
      .attr("offset", d => d)
      // 针对（相对于纵坐标轴）不同的偏移量设置不同的颜色
      // 其中 color.interpolator() 返回颜色比例尺 color 所采用的插值器，即 d3.interpolateTurbo
      // 插值器会根据当前的相对偏移量 d（百分比形式，其范围是 [0, 1]）进行采样，返回相应的颜色值
      // 这里共采样生成 11 种颜色
      .attr("stop-color", color.interpolator());
      // ❓ 在颜色采样时不需要基于温度值数据，所以前面所构建的（与温度相关）颜色比例尺实际没有用处
      // 这里可以直接使用 d3.interpolateTurbo 就不需要在前面构建颜色比例尺 ❓
      // .attr("stop-color", d3.interpolateTurbo);

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
    // 💡 调用线段生成器方法 line.defined() 设置数据完整性检验函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
    // 该函数也是有三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
    // 当函数返回 true 时，线段线段生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
    // 当函数返回 false 时，该元素就会就会跳过，当前线段就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一段段分离的线段
    // 这里通过判断数据点的属性 d.temperature（温度）是否为 NaN 来判定该数据是否缺失
    .defined(d => !isNaN(d.temperature))
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
    // ⚠️ 它与 selection.data(value) 不同，该方法不会将数组进行「拆解」
    // 即这个方法不会进行数据与元素的一一链接计算，并且不影响索引，不影响（不产生）enter 和 exit 选择集
    // 而是将数据 value 作为一个整体绑定到选择的各个元素上，因此使用该方法选择集的所有 DOM 元素绑定的数据都一样
    // 具体参考官方文档 https://d3js.org/d3-selection/joining#selection_datum
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#绑定数据
    .datum(data)
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    // 这里通过 id 值（拼接出特定格式的字符串/链接）来引用/使用前面所创建的渐变色
    .attr("stroke", `url('#${colorId}')`)
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    // 设置折线之间的连接样式（圆角让连接更加平滑）
    .attr("stroke-linejoin", "round")
    // 设置路径端点的样式
    .attr("stroke-linecap", "round")
    // 调用线段生成器 line
    // 将其返回的结果（字符串）作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line);
});
