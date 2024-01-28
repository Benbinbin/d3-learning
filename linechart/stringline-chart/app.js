// 参考自 https://observablehq.com/@d3/mareys-trains

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = 2400; // 高度
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const margin = { top: 120, right: 30, bottom: 120, left: 50 };

// 为不同类型的列车编码不同的颜色
const colors = {
  N: "rgb(34, 34, 34)", // 黑色
  L: "rgb(183, 116, 9)", // 黄色
  B: "rgb(192, 62, 29)", // 红色
  W: "currentColor", // 继承其祖先/父元素的颜色（黑色）
  S: "currentColor" // 继承其祖先/父元素的颜色（黑色）
};

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/mareys-trains 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/75969b619d8c37543b0d95a5f32f5bbd/raw/526222fbf6b91ecba7671ff2cb1761914a664db5/schedule.tsv";

// 使用 d3.tsv(fileUrl[, row]) 获取并解析分隔符为 `\t` 的 DSV 数据（具有表头信息），获得一个可迭代对象（对象数组）
// D3 会为所生成的数组（它也是一个对象）添加一个属性 columns，它的属性值是一个数组，包含了表头（各列）信息
d3.tsv(dataURL, d3.autoType).then((rawData) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(rawData);

  // 从 rawData.columns 表头数组中提取出车站的名称
  const stations = rawData.columns
    // 使用正则表达式 /^stop\|/（表示以 `stop|` 开头）筛选出表示车站的列名
    .filter(key => /^stop\|/.test(key))
    // 遍历筛选所得的列名（数组），对其中每个元素进行转换
    .map(key => {
      // 将车站的列名（字符串）按照分隔符 `|` 进行「分解」（为数组）
      // 其中第二个元素就是车站名，赋值给变量 name；第三个元素是（与第一个车站❓）距离，赋值给变量 distance；第四个元素是车站所在的区域（通常车站距离城市中心越远，所在的 zone 就越高），赋值为变量 zone
      const [, name, distance, zone] = key.split("|");
      // 返回每个元素转换得到的对象，其中各属性的含义为：
      // * key 原始的列名
      // * name 车站名
      // * disatance （当前车站距离第一个车站的）距离
      // * zone 车站所属的区域
      return { key, name, distance: +distance, zone: +zone };
    });

  // 变量 alldata 是处理后的数据集（数组），并添加了属性 stations（包含车站信息）
  const alldata = Object.assign(
    // 对数据集 data 进行转换处理
    // 将每个元素（对象）的属性进行「精简」，将原本与车站相关的一系列属性，统一到一个新的属性 stops 中表示
    rawData.map(d => ({
      number: d.number, // 列车的名称
      type: d.type, // 列车的类型
      direction: d.direction, // 列车的方向
      // 列车与车站的对应（时刻值）信息
      stops: stations
        // 遍历数组 stations 的每个元素（每个车站）进行转换处理，主要是解析每个站点的时刻（从字符串转换为 Date 对象）
        // 返回一个对象，其中属性 station 是本来的元素（一个表示当前车站的对象）；属性 time 是当前列车停靠该车站的时刻
        // 通过 d[station.key] 来从原始数据 d 中获取到列车停靠 station.key 车站的时间（字符串）
        // 再使用方法 parseTime() 对时间（字符串）进行处理（得到 Date 对象）
        // 该方法的具体代码解析可以看 👇 后面的函数
        .map(station => ({ station, time: parseTime(d[station.key]) }))
        // 过滤掉每趟列车中时刻值为空的站点
        .filter(station => station.time !== null)
    })),
    { stations }
  );

  console.log(alldata);

  /**
   *
   * 比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是距离（然后在特定的距离标记上相应的车站，作为刻度值），使用 d3.scaleLinear 构建一个线性比例尺
  const x = d3.scaleLinear()
    // 设置定义域范围，使用方法 d3.extent() 遍历所有车站的距离，获取它们的距离范围
    .domain(d3.extent(stations, d => d.distance))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([margin.left + 10, width - margin.right])

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是时刻（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  const y = d3.scaleUtc()
    // 设置定义域范围，从早上 4:30 到（第二天）早上 1:30
    .domain([parseTime("4:30AM"), parseTime("1:30AM")])
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([margin.top, height - margin.bottom])

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴的方法
  svg.append("g")
    // 设置字体样式
    .style("font", "10px sans-serif")
    // 为每个车站创建一个 <g> 元素（作为子容器）
    .selectAll("g")
    // 绑定数据（包含所有车站的数组 stations）
    // 在特定的距离标记上相应的车站，作为刻度值
    .data(stations)
    .join("g") // 将一系列子容器挂载到父元素上
    // 通过 CSS 的 transform 属性将这些子容器分别「移动」到相应位置（作为横坐标的刻度值）
    // 其中横向坐标值是基于每个容器所绑定的数据 d.distance（每个车站与第一个车站的距离）并通过横坐标轴比例尺 x 进行映射而得到；而纵向坐标值都是 0，即位于 svg 的顶部
    .attr("transform", d => `translate(${x(d.distance)},0)`)
    // 在每个子容器中添加一个 <line> 元素，作为顶部刻度线
    .call(g => g.append("line")
      // 设置线段的开始点和结束点的坐标值
      .attr("y1", margin.top - 6) // 开始点的纵坐标值
      .attr("y2", margin.top) // 结束点的纵坐标值
      // 以上设置将刻度线定位到 svg 的顶部，长度为 6px
      // 由于刻度线是垂直的，所以这里不需要设置线段的开始点和结束点的横坐标值（即采用默认值 x1 和 x2 两者相同）
      // 💡 而在前面使用 CSS 的 transform 属性对各个子容器进行了「移动」，所以刻度线实际的横向定位是跟随所属的子容器）
      .attr("stroke", "currentColor")) // 设置刻度线的颜色（继承父元素的颜色，黑色）
    // 继续在每个子容器中添加一个 <line> 元素，作为底部刻度线
    .call(g => g.append("line")
      // 将刻度线定位到 svg 的底部，长度也是 6px
      .attr("y1", height - margin.bottom + 6)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "currentColor"))
    // 继续在每个子容器中添加一个 <line> 元素，作为网格参考线的竖线
    .call(g => g.append("line")
      // 设置线段的开始点和结束点的坐标值
      .attr("y1", margin.top) // 开始点的纵坐标值位于 svg 的顶部
      .attr("y2", height - margin.bottom) // 结束点的纵坐标值位于 svg 的底部
      .attr("stroke-opacity", 0.2) // 设置参考线的透明度为 20%
      .attr("stroke-dasharray", "1.5,2") // 设置参考线的样式（虚线）
      .attr("stroke", "currentColor")) // 设置参考线的颜色
    // 在每个子容器中添加一个 <text> 元素，在 svg 的顶部显示车站名（作为刻度值）
    .call(g => g.append("text")
      // 通过 CSS 的 transform 属性将文本移动到 svg 的顶部，并旋转 90°  让文本以垂直的方式显示
      .attr("transform", `translate(0,${margin.top}) rotate(-90)`)
      // 设置文本在垂直方向的定位（由于旋转了 90°，所以通过属性 x 设置的是垂直方向）
      .attr("x", 12)
      // 设置文本在水平方向的小偏移量（由于旋转了 90°，所以通过属性 dy 设置的是水平方向）
      .attr("dy", "0.35em")
      // 设置文本内容，采用每个子容器所绑定的数据的属性 d.name（车站名）
      .text(d => d.name))
    // 继续在每个子容器中添加一个 <text> 元素，在 svg 的底部显示车站名（作为刻度值）
    .call(g => g.append("text")
      .attr("text-anchor", "end") // 设置对齐方式
      .attr("transform", `translate(0,${height - margin.top}) rotate(-90)`)
      .attr("x", -12)
      .attr("dy", "0.35em")
      .text(d => d.name))
  // 💡 注意以上有多次通过 selection.call() 的方式来执行代码/调用函数
  // 会将选择集中的元素 <g> 作为第一个参数传递给回调函数
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴的方法
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${margin.left},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y)
      // 纵坐标是时间比例尺，通过 axis.ticks(interval) 生成时间轴（刻度）
      // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks
      // 参数 interval 是时距器，用于生成特定间距的时间
      // 关于时距器的介绍，可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间边距计算器
      // 这里使用一个 D3 内置的时距器 d3.utcHour 创建一个以小时为间距的 interval
      .ticks(d3.utcHour)
      // 通过 axis.tickFormat(specifier) 设置刻度值的格式
      // 参数 specifier 是时间格式器，将一个 Date 对象格式化 format 为字符串
      // 关于时间格式器的介绍，可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间格式器
      // 其中 %-I 表示小时（采用 12 小时制），分隔符 `-` 表示对应单个数字（例如凌晨 1 点）不使用填充字符将其变成双位数字
      // 其中 %p 表示上午或下午，用字符串 AM 或 PM 表示
      .tickFormat(d3.utcFormat("%-I %p")))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线（通过 CSS 类名 ".tick line" 选中它们），作为网格参考线的横线
    // 然后再用 lower() 方法将该插入的克隆移到父元素的顶部，作为第一个子元素，避免遮挡刻度线（根据 svg 元素渲染顺序，它们会先绘制，然后被之后绘制的刻度线覆盖/遮挡）
    .call(g => g.selectAll(".tick line").clone()
      .attr("stroke-opacity", 0.2) // 设置参考线的透明度为 20%
      .attr("x2", width)) // 调整参考线的终点位置（往右移动）

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 为这些折线创建一个大容器
  const train = svg.append("g")
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    // 进行「二次选择」，为每个列车的折线构建一个（虚拟）子容器
    .selectAll("g")
    // 绑定数据
    .data(alldata)
    // 将子容器挂载到父容器中（创建真实的子容器）
    .join("g");

  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 设置横纵坐标读取函数，它们会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据点所对应的横纵坐标
    // 读取函数的逻辑与调用线段生成器时所传入的数据相关，这里所传入的值是每个列车的站点 d.stops 数组
    // 设置横坐标读取函数，基于列车当前所停靠车站的（相对第一个车站）距离 d.station 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.station.distance))
    // 设置纵坐标读取函数，基于列车当前所停靠车站的时刻值，并采用比例尺 y 进行映射，计算出相应的纵坐标值
    .y(d => y(d.time))

  // 在每个子容器中创建一个 <path> 元素
  // 使用路径 <path> 元素绘制折线
  train.append("path")
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置折线的描边颜色，根据子容器所绑定的数据 d.type（列车的类型）再通过 colors 对象进行映射得到对应的颜色值
    .attr("stroke", d => colors[d.type])
    // 调用线段生成器 line
    // 将其返回的结果（字符串）作为 `<path>` 元素的属性 `d` 的值
    .attr("d", d => line(d.stops));

  // 在每个子容器中创建一个 <g> 元素，作为该列车的数据点的容器
  train.append("g")
    // 设置描边颜色
    .attr("stroke", "white")
    // 设置填充颜色，根据子容器所绑定的数据 d.type（列车的类型）再通过 colors 对象进行映射得到对应的颜色值
    .attr("fill", d => colors[d.type])
    // 「二次选择」，使用 <circle> 元素，绘制（虚拟）小圆形来表示数据点
    .selectAll("circle")
    // 绑定数据，使用当前子容器（列车）的站点数组
    .data(d => d.stops)
    // 将一系列 <circle> 元素挂载到父容器中（创建真实的小圆形）
    .join("circle")
    // 使用 CSS 的 transform 属性将这些小圆形分别「移动」到相应位置
    // 该圆形的横坐标值是当前列车所停靠的车站（与第一个车站相比）的距离 d.station.distance 相关，并通过横坐标轴比例尺 x 进行映射而得到
    // 该圆形的纵坐标值是当前列车所停靠的车站的时刻值，并通过纵坐标轴比例尺 y 进行映射而得到
    .attr("transform", d => `translate(${x(d.station.distance)},${y(d.time)})`)
    .attr("r", 2.5); // 设置小圆形的半径



  /**
   * 创建 tooltip 以及实现交互
   */
  // 创建一个 <g> 元素，作为一个 tooltip 的大容器
  const tooltipContainer = svg.append("g")

  // 创建一个 <g> 元素，作为 tooltip 弹出提示框的容器
  const tooltip = tooltipContainer.append("g")
    // 设置字体样式
    .style("font", "10px sans-serif");

  // 在容器中添加一个 <path> 元素，用于绘制 tooltip 的外框（带小尖角）
  const path = tooltip.append("path")
    .attr("fill", "white");
  // 在容器中添加一个 <text> 元素，用于显示提示内容
  const text = tooltip.append("text");

  // 在 <text> 元素内添加一个 <tspan> 元素
  // 它相当于在 svg 语境下的 span 元素，用于为部分文本添加样式
  const line1 = text.append("tspan")
    // 设置该元素的定位，位于 <text> 元素的左上角（作为第一行）
    .attr("x", 0)
    .attr("y", 0)
    // 设置字体样式为加粗
    .style("font-weight", "bold");

  // 继续在 <text> 元素内添加一个 <tspan> 元素
  const line2 = text.append("tspan")
    .attr("x", 0)
    // 纵向定位是 1.1em 相当于在第二行（em 单位是与字体大小相同的长度）
    .attr("y", "1.1em");

  // 继续在 <text> 元素内添加一个 <tspan> 元素
  const line3 = text.append("tspan")
    .attr("x", 0)
    // 纵向定位是 2.2em 相当于在第三行
    .attr("y", "2.2em");


  // 使用 d3.utcFormat(specifier) 创建一个时间格式器，用于 tooltip 内容的格式化
  // 将 Date 对象格式化为特定的字符串，参数 specifier 用于指定字符串的格式
  // 其中 %-I 表示小时（采用 12 小时制），分隔符 `-` 表示对应单个数字（例如凌晨 1 点）不使用填充字符将其变成双位数字
  // 其中 %M 表示分钟
  // 其中 %p 表示上午或下午，用字符串 AM 或 PM 表示
  const formatTime = d3.utcFormat("%-I:%M %p");

  // 将所有列车停靠所有车站的信息提出提出出来，构成一个数组，对应于图表上的数据点
  // 首先通过 data.map(d => d.stops.map(s => ({train: d, stop: s}))) 遍历所有列车，返回一个嵌套数组
  // 即每个元素也是一个数组，表示当前列车所停靠的所有站点
  // 而这些内嵌数组的元素是一个对象，具有如下属性
  // * train 当前列车的在 data 数据集中对应的数据
  // * stop 当前列车所停靠站点的数据
  // 再通过 d3.merge() 将嵌套数据「拍平」，它可以将二次嵌套的数据（即数组内的元素也是数组），变成扁平化的数据
  // 具体参考官方文档文档 https://d3js.org/d3-array/transform#merge
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
  // 所以这个 stops 数组的每个元素是指某个列车停靠某个车站
  const stops = d3.merge(alldata.map(d => d.stops.map(s => ({ train: d, stop: s }))))

  // 创建一个维诺图生成器，在鼠标悬浮交互中使用
  // 先使用 d3.Delaunay.from(points) 基于数据集 points 生成一个三角剖分器 delaunay
  // 数据集的格式有特定的要求，它是一个嵌套数组，即每个元素也还是一个数组，嵌套数组的第一个元素是数据点的横坐标值，第二个元素是数据点的纵坐标值
  // 由于这里传入的数组是 stop，它的格式并不规范，所以还需要设置 access function 访问函数
  // 其中 x(d.stop.station.distance) 是横坐标值，基于当前列车所停靠车站（与第一个车站相比）的距离，并通过横坐标轴比例尺 x 进行映射而得到
  // 其中 y(d.stop.time) 是纵坐标值，基于当前列车所停靠车站的时刻值，并提供纵坐标值比例尺 y 进行映射而得到
  // 然后调用方法 delaunay.voronoi(bounds) 创建一个维诺图生成器 voronoi，其中参数 bounds 设定视图的边界
  // 关于维诺图的详细介绍可以参考官方文档 https://d3js.org/d3-delaunay/delaunay
  // 或查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-delaunay
  const voronoi = d3.Delaunay
    .from(stops, d => x(d.stop.station.distance), d => y(d.stop.time))
    .voronoi([0, 0, width, height])

  // 创建一个 <g> 元素，作为 voronoi 维诺图的容器
  tooltipContainer.append("g")
    // 由于所绘制的维诺图只用于交互，而不需要显示出来，所以填充颜色 fill 设置为 none
    .attr("fill", "none")
    // 允许指针事件（用户通过指针与维诺图进行交互）
    .attr("pointer-events", "all")
    // 使用 <path> 路径元素绘制维诺图
    .selectAll("path")
    // 绑定数据（stops 是各列车和各站点对应构建出来的数组，对应于图表上的数据点）
    .data(stops)
    .join("path") // 将一系列 <path> 元素（但是还没有设置具体的路径）挂载到容器中
    // 为每个 <path> 元素设置属性 `d`（具体的路径形状）
    // 通过调用维诺图生成器的方法 voronoi.renderCell(i) 绘制出第 i 格 cell 单元格
    // 返回一个路径字符串（用作 svg 元素 <path> 的属性 d 的属性值）
    .attr("d", (d, i) => voronoi.renderCell(i))
    // 通过方法 selection.on() 为选择集的元素设置事件监听器，以响应用户操作实现与图表的交互
    // 为每个维诺图 cell 单元格设置 mouseout 事件监听器
    // 当指针移离该单元格时，隐藏 tooltip
    .on("mouseout", () => tooltip.style("display", "none"))
    // 为每个维诺图 cell 单元格设置 mouseover 事件监听器
    // 当指针悬浮在该单元格时，显示 tooltip
    .on("mouseover", (event, d) => {
      // ❓ null 是 display 属性的无效值，所以采用默认值（实际上继承自父元素，其实是 block ❓）
      tooltip.style("display", null);
      // 设置 tooltip 里的文本内容
      // d 是当前鼠标所悬浮的维诺图 cell 单元格所绑定的数据
      line1.text(`${d.train.number}${d.train.direction}`); // 第一行的内容是列车号码和列车的方向
      line2.text(d.stop.station.name); // 第二行的内容是所停靠的车站名称
      line3.text(formatTime(d.stop.time)); // 第三行是停靠时刻值（通过方法 formatTime() 进行格式化）
      // 设置 tooltip 边框的描边颜色，通过 colors 对象进行映射得到与列车类型所对应的颜色值
      path.attr("stroke", colors[d.train.type]);
      // 使用方法 selection.node() 返回选择集第一个非空的元素，这里返回的是 <text> 元素
      // 然后通过 SVGGraphicsElement.getBBox() 获取到该元素的大小尺寸
      // 返回值是一个对象 {x: number, y: number, width: number, height: number } 表示一个矩形
      // 这个矩形是刚好可以包裹该 svg 元素的最小矩形
      const box = text.node().getBBox();
      // 绘制 tooltip 边框，设置 <path> 元素的属性 `d`（具体路径形状）
      // 命令 M 是将画笔移动到左上角
      // 命令 H 绘制水平线，并在中间有一个小三角凸起（构成 tooltip 的指针形状，指向数据点）
      // 命令 V 绘制垂直线
      // 最终绘制出的 tooltip 边框，距离文本内容 10px（可以看作是 padding）
      path.attr("d", `
          M${box.x - 10},${box.y - 10}
          H${box.width / 2 - 5}l5,-5l5,5
          H${box.width + 10}
          v${box.height + 20}
          h-${box.width + 20}
          z
        `);

      // 通过 CSS 的 transform 属性将 tooltip 「移动」到相应位置
      // 其中横坐标值是基于 d.stop.station.distance（当前列车所停靠车站与第一个车站的距离）并通过横坐标轴比例尺 x 进行映射
      // 纵坐标值是基于 d.stop.time（所停靠车站的时刻值）并提供纵坐标比例尺 y 进行映射
      // 为了将 tooltip 的指针形状与数据点对齐，需要对横纵坐标进行「校正」调整
      // 横坐标值偏移 box.width / 2 即 box 宽度的一半，纵坐标值偏移 28px 大概 3 行文字高度
      tooltip.attr("transform", `translate(${x(d.stop.station.distance) - box.width / 2},${y(d.stop.time) + 28
        })`);
    });
});

// 用于解释时间的函数
function parseTime(string) {
  // 使用方法 d3.utcParse(specifier) 创建一个时间解析器
  // 它基于说明符 specifier 所指定的格式来将字符串解析为 Date 对象（采用协调世界时 UTC 来表示时间）
  // 其中 %I 表示小时（采用 12 小时制），%M 表示分钟，%p 表示表示上午或下午，用字符串 AM 或 PM 表示
  const parseTime = d3.utcParse("%I:%M%p");

  // 使用时间解析器 parseTime 对字符串进行解析
  const date = parseTime(string);
  // 再对时间进行后处理
  // 如果时间（小时）是在凌晨 3 点之前，则将日期（天数）增加一天
  // 相当于将凌晨到站的列车的日期归到后一天 ❓
  if (date !== null && date.getUTCHours() < 3) date.setUTCDate(date.getUTCDate() + 1);
  return date; // 最后返回 Date 对象
}