// 参考自 https://observablehq.com/@d3/multi-line-chart/2

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
  .attr("viewBox", [0, 0, width, height])
  // 设置字体演示（这具体会影响到 Tooltip 的文字样式）
  .attr("style", "font: 10px sans-serif;");

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/multi-line-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/b41f8852023b37161f72459183c09513/raw/381fe0bf5e3ead0ed707800a0857db420a659c9c/bls-metro-unemployment.csv";

d3.csv(dataURL, d3.autoType).then((unemployment) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(unemployment);

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
    .domain(d3.extent(unemployment, d => d.date))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（失业率），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是失业率的最高值
    // 另外还使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
    // 具体参考官方文档 https://github.com/d3/d3-scale#continuous_nice
    .domain([0, d3.max(unemployment, d => d.unemployment)]).nice()
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([height - marginBottom, marginTop]);

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
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 绘制纵坐标轴的参考辅助线
    // 复制了一份刻度线（通过 CSS 类名 ".tick line" 选中它们），用以绘制图中纵向的网格参考线
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
      .text("↑ Unemployment (%)")); // 设置文本内容

  /**
   *
   * 绘制维诺图
   *
   */
  // 对数据集进行转换
  // 将每个数据点（一个对象）转换为一个数组 [x, y, z]，其中第一、二个元素是数据点所对应的坐标值，第三个元素是所属的系列
  // 从每个数据点提取出相应的数据 d.date 是日期，d.unemployment 是失业率，d.division 是都市分区
  // 并用横坐标轴比例尺 x(d.date) 和纵坐标轴比例尺 y(d.unemployment) 进行映射，得到各数据点相应的坐标值
  const points = unemployment.map((d) => [x(d.date), y(d.unemployment), d.division]);

  // 将数据点基于不同的系列进行分组，以便后面绘制折线时进行数据绑定
  // 方法 d3.rollup(iterable, reduce, ...keys) 基于指定的属性 keys 进行分组，并对各分组进行 reduce「压缩降维」，最后返回一个 InternMap 对象
  // * 第一个参数 iterable 是可迭代对象，即数据集
  // * 第二个参数 reduce 是对分组进行压缩的函数，每个分组会依次调用该函数（入参就是包含各个分组元素的数组），返回值会作为 InternMap 对象中（各分组的）键值对中的值
  // * 余下的参数 ...keys 是一系列返回分组依据
  // 具体参考官方文档 https://d3js.org/d3-array/group#rollup
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
  // 这里是根据每个数据点所属的系列（都市分区）d[2] 进行分组
  // 然后再对每个分组调用 reduce 函数 v => Object.assign(v, {z: v[0][2]}) 进行「压缩降维」
  // 在这里 reduce 函数的作用其实并不是「压缩降维」，而是为每个分组添加上所属系列的名称
  // 使用 Object.assign(obj1, obj2) 为传入的数组 v（也是对象）添加额外的属性 z，它的值是 v[0][2] 第一个元素（也是一个数组）的第三个元素（即所属的系列），然后再返回该数组
  const groups = d3.rollup(points, v => Object.assign(v, { z: v[0][2] }), d => d[2]);

  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line();

  const path = svg.append("g") // 为折线折线创建一个容器
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置（容器/父元素）描边颜色
    .attr("stroke", "steelblue")
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    // 设置折线之间的连接样式（圆角让连接更加平滑）
    .attr("stroke-linejoin", "round")
    // 设置路径端点的样式
    .attr("stroke-linecap", "round")
    // 使用路径 <path> 元素绘制折线
    // 由于是多个折线，所以使用 selectAll 选择一系列的 <path> 元素（虚拟占位元素）
    .selectAll("path")
    // 绑定数据
    // groups 是前面 ☝️ 对数据集进行分组转换生成的，它是一个 InternMap 对象
    // 通过调用方法 groups.values() 可以得到一个迭代器（可以遍历得到每个分组的值，即各系列对应的数组）
    .data(groups.values())
    .join("path") // 将线段路径绘制到页面上
    // 为元素设置一个 CSS 属性 mix-blend-mode，设置为 multiple
    // 当折线之间重叠时产生加深颜色的效果
    // 关于该 CSS 属性具体可以参考 https://developer.mozilla.org/zh-CN/docs/Web/CSS/mix-blend-mode
    .style("mix-blend-mode", "multiply")
    // 调用线段生成器 line
    // 将其返回的结果（字符串）作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line);

  /**
   *
   * 创建 tooltip 以及实现交互
   *
   */
  // 当鼠标悬浮在 svg 元素上，会有一个提示框显示相应数据点的信息
  // 该 tooltip 由一个圆点（表示数据点）和描述数据的文字构成
  const dot = svg.append("g") // 创建一个容器
    .attr("display", "none"); // 默认是不显示的

  // 在容器内添加一个 <circle> 元素，以小圆形表示数据点
  dot.append("circle")
    .attr("r", 2.5); // 设置半径长度

  // 在容器内添加一个 <text> 元素，用于展示注释内容
  dot.append("text")
    .attr("text-anchor", "middle") // 文本对齐方式
    .attr("y", -8); // 在垂直方向设置一点（向上）小偏移

  // 为 svg 元素设置一系列事件的监听器，以响应用户的交互
  svg
    .on("pointerenter", pointerentered) // 该事件处理函数在鼠标指针进入 svg 元素时触发
    .on("pointermove", pointermoved) // 该事件处理函数在鼠标指针位于 svg 元素上移动时（不断）触发
    .on("pointerleave", pointerleft) // 该事件处理函数在鼠标指针离开 svg 元素时触发
    .on("touchstart", event => event.preventDefault()); // 取消触控事件的默认行为

  // 该函数在鼠标指针进入 svg 元素时被触发
  // 其作用是将所有折线的颜色改为灰色，并显示 Tooltip
  function pointerentered() {
    // 取消折线与背景元素的混合模式
    // 并将所有折线的描边颜色都改为灰色
    path.style("mix-blend-mode", null).style("stroke", "#ddd");
    dot.attr("display", null); // 显示 Tooltip
  }

  // 该函数在鼠标指针位于 svg 元素上移动时（不断）触发
  // 其作用是寻找距离鼠标指针位置最近的数据点，并更新高亮的数据点和相应的系列，以及 Tooltip 的内容
  // 在寻找距离最近的数据点时，使用穷举法（对于较小的数据集，这个方法也足够快了）
  // 即直接遍历所有数据点，并计算它们与指针位置的距离，以此来找到最近的数据点
  function pointermoved(event) {
    // 使用 d3.pointer(event, target) 获取指针相对于给定元素 target 的横纵坐标值（参数 target 是可选的，它的默认值是 currentTarget，即设置了该事件监听器的 DOM 元素）
    // 虽然可以使用 `event.pageX` 和 `event.pageY` 来获取鼠标定位（位于网页的绝对值）
    // 但是一般使用方法 d3.pointer 将鼠标位置转换为相对于接收事件的元素的局部坐标系，便于进行后续操作
    // 可以参考官方文档 https://d3js.org/d3-selection/events#pointer
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#处理事件
    // 这里得到的距离 (xm, ym) 是鼠标指针相对于 svg 元素（左上角）的横纵坐标值
    const [xm, ym] = d3.pointer(event);
    // 使用 d3.leastIndex(iterable, accessor) 获取可迭代对象 iterable 中的最小值所对应的索引值，其中参数 accessor 是访问器
    // 访问器 accessor 是一个函数，接收一个参数 d，即当前遍历的可迭代对象的元素，其返回值代表该元素，用于进行对比
    // 这里的可迭代对象是数据集 points
    // 访问器 accessor 是 ([x, y]) => Math.hypot(x - xm, y - ym)
    // 通过数组解构得到当前所遍历元素（一个三元数组）的前两个元素 [x, y] 是该数据点的横纵坐标值
    // 并使用 JS 原生方法 Math.hypot()（用于计算欧几里得距离）计算数据点与鼠标指针的距离
    const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
    // 通过索引值 i 从数据集 points 中获取到相应的数据点（一个三元数组）
    // 并通过数组解构，得到它的横纵坐标值 x 与 y，以及所属的系列 z（都市分区）
    const [x, y, k] = points[i];
    // 筛选出系列 k 所对应的折线，并设置不同的描边颜色
    // path 是包含一系列折线的选择集
    // 它所绑定的数据是 groups.values() 的返回值，其中每个元素都额外添加了属性 z，表示所属的系列
    // 通过解构出的属性 z 与 k 进行对比，如果该折线所属的系列就是 k，则描边颜色设置为 null，则继承/采用容器/父元素的描边颜色，即蓝色；如果该折线所属的系列不是 k，则设置为灰色
    // 然后通过 selection.filter() 对选择集进行二次筛选，选出系列 k 所对应的折线构建一个新的选择集
    // 再使用 selection.raise() 将选择集的元素重新插入页面，这样就可以让系列 k 所对应的折线位于其他折线的上方（避免遮挡）
    path.style("stroke", ({ z }) => z === k ? null : "#ddd").filter(({ z }) => z === k).raise();
    // 将 Tooltip 移动到高亮数据点的位置
    dot.attr("transform", `translate(${x},${y})`);
    // 设置 Tooltip 的文本内容（所属系列的名称）
    dot.select("text").text(k);
  }

  // 该函数在鼠标指针离开 svg 元素时触发
  function pointerleft() {
    // 恢复折线与背景元素的混合模式
    // 并将取消所有折线的描边颜色，继承/采用容器/父元素的描边颜色，即蓝色
    path.style("mix-blend-mode", "multiply").style("stroke", null);
    // 隐藏 Tooltip
    dot.attr("display", "none");
  }

});
