// 参考自 https://observablehq.com/@d3/line-with-tooltip/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
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
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "font: 10px sans-serif;") // 设置字体大小及所使用的字体

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/line-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/61a819373d0eada06b7966a560aafc7e/raw/979711fba712b0263309234239bfbd144a8a3edc/aapl.csv";

d3.csv(dataURL, d3.autoType).then((aapl) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(aapl);

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
  const x = d3.scaleUtc(
    // 设置定义域范围
    // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
    d3.extent(aapl, d => d.date),
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    [marginLeft, width - marginRight]
  );

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（股价），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear(
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是股价的最高值
    // 通过 d3.max(aapl, d => d.close) 从数据集中获取股价的最大值
    [0, d3.max(aapl, d => d.close)],
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    [height - marginBottom, marginTop]
  );

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
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // 绘制纵坐标轴
  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    .call(d3.axisLeft(y).ticks(height / 40))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中纵向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      // 调整复制后的刻度线的终点位置（往右移动）
      .attr("x2", width - marginLeft - marginRight)
      .attr("stroke-opacity", 0.1)) // 调小网格线的透明度
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的顶部（即容器的左上角）
      .attr("x", -marginLeft)
      .attr("y", 10)
      .attr("fill", "currentColor") // 设置文本的颜色
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .text("↑ Daily close ($)")); // 设置文本内容

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了父容器 context 而不同。如果设置了父容器，则生成 `<path>` 元素，并添加到父容器中；如果没有则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line 或 https://github.com/d3/d3-shape/tree/main#lines
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.date))
    // 设置纵坐标读取函数
    .y(d => y(d.close));

  // 将线段路径绘制到页面上
  svg.append("path") // 使用路径 <path> 元素绘制折线
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    .attr("stroke", "steelblue")
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    // 由于线段生成器并没有调用方法 line.context(parentDOM) 设置父容器
    // 所以调用线段生成器 line(aapl) 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line(aapl));

  /**
   *
   * 创建 Tooltip
   *
   */
  // 为 Tooltip 创建一个容器
  const tooltip = svg.append("g");

  // 用于格式化股价的方法
  function formatValue(value) {
    // 使用 JS 原生方法 number.toLocalString() 将数值转换为使用金钱为单位的表达格式
    // 参考 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
    return value.toLocaleString("en", {
      style: "currency",
      currency: "USD"
    });
  }

  // 用于格式化时间的方法
  function formatDate(date) {
    // 使用 JS 原生方法 date.totoLocaleString() 将 Date 时间对象转换为字符串（并采用特定的格式来表达）
    // 参考 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
    return date.toLocaleString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });
  }

  // 在 svg 元素上添加与指针相关事件的监听器，以实现交互
  svg
    // 当 pointerenter 和 pointermove 事件被触发时，执行 pointermoved 函数
    // 函数 pointermoved 的具体代码 👇 在下面
    .on("pointerenter pointermove", pointermoved)
    // 当 pointerleave 事件被触发时，执行 pointerleft 函数
    // 函数 pointerleft 的具体代码 👇 在下面
    .on("pointerleave", pointerleft)
    // 当 touchstart 事件被触发时，阻止浏览器的默认行为
    .on("touchstart", (event) => event.preventDefault());

  // 使用方法 d3.bisector(accessor) 创建一个数组分割器 bisector，它会基于特定值，将（有序）的数组里的元素一分为二
  // 参数 accessor 是访问函数，在调用分割器对数组进行分割时，数组的每个元素都调用该访问函数，将函数返回的值用于分割/比较时该元素的代表值
  // 这里返回的值是时间（用于计算数据点所对应的横坐标值）
  // bisector.center 将分割的标准设置为「临近分割」
  // 关于分割器的介绍参考官方文档 https://d3js.org/d3-array/bisect#bisector
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#二元分割
  const bisect = d3.bisector((d) => d.date).center;

  // 鼠标指针在 svg 元素上移动时，触发该函数
  function pointermoved(event) {
    // 基于将鼠标所在位置（对应的横坐标值 x），使用分割器对数组 aapl 进行「临近分割」
    // 💡 返回索引值 i，如果将当前鼠标所对应的横坐标值插入到该位置（可以使用数组的 arr.splice() 方法），依然保持数组有序
    // 💡 也就是所该索引值所对应的数据点是最靠近鼠标（只考虑/基于横坐标值）
    // 首先使用 d3.pointer(event, target) 获取指针相对于给定元素 target 的横纵坐标值（参数 target 是可选的，它的默认值是 currentTarget，即设置了该事件监听器的 DOM 元素）
    // 虽然可以使用 `event.pageX` 和 `event.pageY` 来获取鼠标定位（位于网页的绝对值）
    // 但是一般使用方法 d3.pointer 将鼠标位置转换为相对于接收事件的元素的局部坐标系，便于进行后续操作
    // 可以参考官方文档 https://d3js.org/d3-selection/events#pointer
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#处理事件
    // 然后通过 continuous.invert(value) 向比例尺传递一个值域的值 value，反过来得到定义域的值
    // 这对于交互很有用，例如根据鼠标在图表的位置，反向求出并显式对应的数据
    // ⚠️ 该方法只支持值域为数值类型的比例尺，否则返回 `NaN`
    const i = bisect(aapl, x.invert(d3.pointer(event)[0]));
    // ❓ null 是 display 属性的无效值，所以采用默认值（实际上继承自父元素，其实是 block ❓）
    // tootlip 默认是隐藏的，这里将其显示出来
    tooltip.style("display", null);
    // 使用 CSS 的 transform 属性将 tooltip 移动到相应的位置
    // 索引值 i 是 ☝️ 前面对数组 aapl 进行「临近分割」所得到的
    // 通过 aapl[i] 获取最靠近鼠标的数据点，再通过比例尺 x 或 y 进行映射得到数据点相应的横纵坐标值，作为 tooltip 容器的坐标值
    // 所以 tooltip 容器会定位到离鼠标最近的数据点上
    tooltip.attr(
      "transform",
      `translate(${x(aapl[i].date)},${y(aapl[i].close)})`
    );

    // 绘制 tooltip 的边框
    const path = tooltip
      .selectAll("path") // 使用 <path> 元素绘制 tooltip 的边框（创建虚拟/占位元素）
      // 绑定数据，该数组只有一个元素
      // 因为这里是为了在 tooltip 内添加一个 <path> 元素作为边框，所以绑定数据的具体值是无所谓的
      // 在这里相当于为元素绑定一个 undefined 作为数据
      .data([,])
      .join("path") // 将 <path> 元素挂载到父元素（tooltip 容器）上
      // 设置填充颜色，为白色
      .attr("fill", "white")
      // 设置描边颜色，为黑色
      .attr("stroke", "black");

    // 设置 tooltip 内容
    const text = tooltip
      .selectAll("text") // 使用 <text> 元素显示文本内容（创建虚拟/占位元素）
      // 绑定数据，该数组只有一个元素
      // 因为这里是为了在 tooltip 内添加一个 <text> 元素来显示内容，所以绑定数据的具体值是无所谓的
      // 在这里相当于为元素绑定一个 undefined 作为数据
      .data([,])
      .join("text") // 将 <path> 元素挂载到父元素（tooltip 容器）上
      .call((text) => text
        // 在 text 选择集内（即 <text> 元素内）添加 <tspan> 元素
        // 它相当于在 svg 语境下的 span 元素，用于为部分文本添加样式
        .selectAll("tspan")
        // 绑定数据
        // 一个二元数组，所以对应生成两个 <tspan> 元素
        .data([formatDate(aapl[i].date), formatValue(aapl[i].close)])
        .join("tspan") // 将 <tspan> 元素挂载到父元素上
        // 设置 <tspan> 元素的定位
        .attr("x", 0) // 横坐标值都是 0，即它们在水平方向上是左对齐的
        // 纵坐标值根据它们在选择集中的索引值 i 计算得出
        // 第一个 <tspan> 的纵坐标值是 0，作为第一行
        // 第二个 <tspan> 的纵坐标值是 1.1em（em 单位是与字体大小相同的长度）相当于在第二行
        .attr("y", (_, i) => `${i * 1.1}em`)
        // 设置字体粗细，根据它们在选择集中的索引值 i 来设置，相当将第二行文字加粗
        .attr("font-weight", (_, i) => (i ? null : "bold"))
        // 设置文本内容，使用所绑定的数据作为内容
        .text((d) => d)
      );

    // 根据 text 和 path 选择集调整 tooltip 大小
    // 函数 size 的具体代码 👇 在下面
    size(text, path);
  }

  // 鼠标指针移出 svg 元素时，触发该函数
  function pointerleft() {
    // 隐藏 tooltip
    tooltip.style("display", "none");
  }

  // 将文本使用一个 callout 提示框包裹起来，而且根据文本内容设置提示框的大小
  // 该函数的第一个参数 text 是包含一个 <text> 元素的选择集
  // 第二个元素 path 是包含一个 <path> 元素的选择集
  function size(text, path) {
    // 使用方法 selection.node() 返回选择集第一个非空的元素，这里返回的是 <text> 元素
    // 然后通过 SVGGraphicsElement.getBBox() 获取到该元素的大小尺寸
    // 返回值是一个对象 {x: number, y: number, width: number, height: number } 表示一个矩形
    // 这个矩形是刚好可以包裹该 svg 元素的最小矩形
    const { x, y, width: w, height: h } = text.node().getBBox();
    // 通过 CSS 属性 transform 调整文本的定位（以关联数据点的位置作为基准，因为 tooltip 容器已经基于数据点进行了定位），让文本落入提示框中
    // 在水平方向上，向左偏移 <text> 元素宽度的一半
    // 在垂直方向上，向下偏移 15px（大概一个半字符高度）与原来纵坐标值 y 的差值
    // 这样就可以让文本与数据点在水平方向上居中对齐，在垂直方向上位于数据点的下方
    text.attr("transform", `translate(${-w / 2},${15 - y})`);
    // 绘制 tooltip 边框，设置 <path> 元素的属性 `d`（具体路径形状）
    // 命令 M 是将画笔进行移动
    // 画笔的起始点是以关联的数据点的位置作为基准，因为 tooltip 容器已经基于数据点进行了定位
    // （M${-w / 2 - 10},5 相当于将画笔移到数据点的左侧，距离大小为文本宽度的一半并加上 10px，垂直方向移到数据点的下方，距离 10px
    // 接着绘制提示框的顶部边框部分
    // 命令 H 绘制水平线，H-5 从画笔所在的位置绘制一条水平线到距离数据点 -5px 的位置（即相对于向右绘制一条水平线）
    // 然后使用 l 命令，采用相对坐标（基于前一个命令）在中间绘制出一个小三角凸起（构成 tooltip 的指针形状，指向数据点）
    // 然后再使用命令 H 绘制顶部边框的（右边）另一半的水平线
    // 命令 V 绘制垂直线，然后使用 l 命令，采用相对坐标（基于前一个命令）绘制底部边框的水平线
    // 最后使用 z 命令自动绘制一条（左侧边框）垂直线，以构成一个闭合边框
    // 最终绘制出的 tooltip 边框，距离文本内容 10px（可以看作是 padding）
    path.attr(
      "d",
      `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`
    );
  }
});
