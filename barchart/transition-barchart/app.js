// 参考自 https://observablehq.com/@d3/bar-chart-transitions

/**
 *
 * 将构建带有过渡动画的条形图的核心代码封装为一个函数（方便复用）
 *
 */
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/sortable-bar-chart
function BarChart(
  data,
  svg,
  {
    // 每个数据点的 x 值的 accessor function 访问函数
    // 默认采用数据点的**序数**作为横坐标值
    x = (d, i) => i,
    y = (d) => d, // 每个数据点的 y 值的 accessor function 访问函数
    // margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
    marginTop = 20, // the top margin, in pixels
    marginRight = 0, // the right margin, in pixels
    marginBottom = 30, // the bottom margin, in pixels
    marginLeft = 40, // the left margin, in pixels
    width = 640, // svg 的宽度
    height = 400, // svg 的高度
    // 横坐标轴的定义域范围
    // 对于条形图而言，其横坐标定义域范围就是一个数组，其中的每一个元素都是一个不同的类别
    // 一般是基于原始数据（去重）提取而成的
    // 也可以在这里手动直接设置希望显示的类别，然后在函数内部有相关的代码对数据进行筛选
    xDomain,
    // 横坐标轴的值域（可视化属性，这里是长度）范围 [left, right] 从左至右，和我们日常使用一致
    xRange = [marginLeft, width - marginRight],
    // 纵轴所采用的比例尺，对于数值型数据，默认采用线性比例尺
    yType = d3.scaleLinear,
    // 纵坐标轴的定义域范围 [ymin, ymax]
    yDomain,
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    yRange = [height - marginBottom, marginTop], // [bottom, top]
    // 设置条形图中邻近柱子之间的间隔大小
    xPadding = 0.1,
    yFormat, // 格式化数字的说明符 specifier 用于格式化纵坐标轴的刻度值
    yLabel, // 为纵坐标轴添加额外文本（一般是刻度值的单位等信息）
    color = "currentColor", // 柱子的颜色
    duration: initialDuration = 250, // 过渡动效的持续时间，单位是毫秒，初始默认值是 250
    // 为每一个图像元素（柱子）设置过渡动效开始的延迟时间
    // 通过一个函数来计算，所以不同（索引值）的元素延迟时间都不一样，可以实现交错过渡移动的效果
    // 默认按顺序依次递增 20 毫秒的延迟
    delay: initialDelay = (_, i) => i * 20
  } = {}
) {
  /**
   *
   * 处理数据
   *
   */
  // 通过 d3.map() 迭代函数，使用相应的 accessor function 访问函数从原始数据 data 中获取相应的值
  const X = d3.map(data, x);
  const Y = d3.map(data, y);

  /**
   *
   * 构建比例尺和坐标轴
   *
   */
  // 计算坐标轴的定义域范围
  // 如果调用函数时没有传入横坐标轴的定义域范围 xDomain，则将其先设置为由所有数据点的 x 值构成的数组
  if (xDomain === undefined) xDomain = X;
  // 然后基于 xDomain 值创建一个 InternSet 对象，以便去重
  // 这样所得的 xDomain 里的元素都是唯一的，作为横坐标轴的定义域（分类的依据）
  xDomain = new d3.InternSet(xDomain);

  // 纵坐标轴的定义域 [ymin, ymax] 其中最大值 ymax 使用方法 d3.max(Y) 从所有数据点的 y 值获取
  if (yDomain === undefined) yDomain = [0, d3.max(Y)];

  // 这里还做了一步数据清洗
  // 基于横坐标轴的定义域所包含的类别
  // 使用 JavaScript 数组的原生方法 arr.filter() 筛掉不属于 xDomain 类别的任意一个的数据点
  // 其中 d3.range(X.length) 生成一个等差数列（使用 Y.length 也可以），作为索引值，便于对数据点进行迭代
  const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

  // 横坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  // 并设置间隔占据（柱子）区间的比例
  const xScale = d3.scaleBand(xDomain, xRange).padding(xPadding);
  // 横轴是一个刻度值朝下的坐标轴
  // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);

  // 纵坐标轴的数据是连续型的数值，默认使用 d3.scaleLinear 构建一个线性比例尺
  const yScale = yType(yDomain, yRange);
  // 纵轴是一个刻度值朝左的坐标轴
  // 并设置坐标轴的刻度数量和刻度值格式
  const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);

  // 数值格式器
  // 通过纵轴的比例尺创建一个格式器
  // 在下面为柱子 <rect> 添加标注信息时用到
  const format = yScale.tickFormat(100, yFormat);

  /**
   *
   * 绘制条形图
   *
   */
  // 一个封装的函数用于为纵坐标轴绘制横向的参考线
  // 传入参数的就是一系列的刻度线的容器 <g>
  function grid(tick) {
    return tick
      .append("line") // 在各容器中分别添加一个线段 <line> 元素
      .attr("class", "grid") // 并为新增的元素添加 grid 类名
      .attr("x2", width - marginLeft - marginRight) // 调整线段的终点位置（往右移动）
      .attr("stroke", "currentColor") // 设置参考线的颜色
      .attr("stroke-opacity", 0.1); // 调小参考线的透明度
  }

  // 绘制纵坐标轴
  const yGroup = svg
    .append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来
    .call(yAxis)
    .call((g) => g.select(".domain").remove()) // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    // 这里调用上面的方法 grid() 绘制横向的参考线
    // 传入参数的就是一系列的刻度线的容器 <g>（具有类名 tick）
    .call((g) => g.selectAll(".tick").call(grid))
    .call((g) =>
      g
        .append("text") // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
        // 将该文本移动到容器的左上角
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start") // 设置文本的对齐方式
        .text(yLabel)
    ); // 文本内容

  // 绘制横坐标轴
  const xGroup = svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`) // 将横坐标轴容器定位到底部
    .call(xAxis); // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来

  // 一个封装的函数用于更新柱子（位置和高度）
  // 传递的参数依次为；
  // * 当前所遍历的柱子元素
  // * 该柱子的 x 值 accessor function 访问函数
  // * 该柱子的 y 值 accessor function 访问函数
  function position(rect, x, y) {
    return (
      rect
        .attr("x", x)
        .attr("y", y)
        // 更新柱子的高度
        // 虽然在本示例中，各柱子的高度（对应的数据）并不会改变
        // 但是将高度和宽度的设置封装起来，会让该示例的代码更具有通用性
        // 这里还对传入的参数 y 进行判断
        // 可以兼容传入的是访问函数或具体的 y 值（数值）
        .attr(
          "height",
          typeof y === "function"
            ? (i) => yScale(0) - y(i)
            : (i) => yScale(0) - y
        ) // 设置柱子的高度
        .attr("width", xScale.bandwidth())
    ); // 设置柱子的宽度（带宽）
  }

  // 绘制条形图内的柱子
  let rect = svg
    .append("g")
    .attr("fill", color) // 设置柱子的颜色
    // 使用 <rect> 元素来绘制柱子
    // 通过设置矩形的左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    .selectAll("rect")
    .data(I) // 绑定的数据是表示数据点的索引值（数组），以下会通过索引值来获取各柱子相应的数据
    .join("rect")
    // 为每个矩形元素添加一个 key 属性，属性值采用相应的字母名称，作为元素的唯一标识符
    // 在之后的过渡动效中使用，以便程序更准确地（设置移动位置）复用这些元素
    .property("key", (i) => X[i]) // for future transitions
    // 调用上面的 position() 方法为每个矩形柱子设置 (x, y) 坐标以及宽高
    // 并分别传入各柱子的 x 值和 y 值的 accessor function 访问函数
    // call 的第二、三个参数，实际是传递给给第一个参数的
    // 关于该方法的具体用法可以参考官方文档 https://github.com/d3/d3-selection/#selection_call
    .call(
      position,
      (i) => xScale(X[i]),
      (i) => yScale(Y[i])
    )
    // 为元素设置一个 CSS 属性 mix-blend-mode，设置为 multiple
    // 可以在过渡动画中，当柱子之间重叠时产生加深颜色的效果
    // 关于该 CSS 属性具体可以参考 https://developer.mozilla.org/zh-CN/docs/Web/CSS/mix-blend-mode
    .style("mix-blend-mode", "multiply")
    // 设置每个柱子的提示信息
    // 在每个柱子内分别添加一个 <title> 元素
    // 当鼠标 hover 在柱子上时会显示相应的信息
    .call((rect) =>
      rect
        .append("title")
        // 提示信息的内容由该柱子所属的类别 X[i] 及其相应的频率 format(Y[i]) 组成
        .text((i) => [X[i], format(Y[i])].join("\n"))
    );

  // Call chart.update(data, options) to transition to new data.

  /**
   *
   * 更新条形图的方法
   *
   */
  // 第一个参数 data 是经过重新排序后的数据
  // 第二个参数是一个对象，包含一些（可选）的配置项
  function update(
    data,
    {
      // 横坐标轴的定义域范围
      // 对于条形图而言，其横坐标定义域范围就是一个数组，其中的每一个元素都是一个不同的类别
      xDomain, // an array of (ordinal) x-values
      // 纵坐标轴的定义域范围 [ymin, ymax]
      yDomain, // [ymin, ymax]
      duration = initialDuration, // 过渡时间
      delay = initialDelay // 为每一个图像元素（柱子）设置过渡动效开始的延迟时间
    } = {}
  ) {
    /**
     *
     * 重新处理数据
     *
     */
    // 每次更新都需要对数据重新处理
    // 因为需要重新构建横坐标轴的定义域范围（各元素/类别的排序不同了）
    // 虽然在该示例中，数据并没有发生变化，只是数据集中数据点的排序发生了变化，通过完全的重新计算处理，虽然需要增加一些性能开销，但是可以让该示例的代码更具有通用性。因为这样的代码就不单纯是适用于改变数据的排序，还可以适用于数据的（筛选）增删的场景
    // 通过 d3.map() 迭代函数，使用相应的 accessor function 访问函数从原始数据 data 中获取相应的值
    const X = d3.map(data, x);
    const Y = d3.map(data, y);

    /**
     *
     * 重新构建比例尺
     *
     */
    // 计算坐标轴的定义域范围
    // 如果调用函数时没有传入横坐标轴的定义域范围 xDomain，则将其先设置为由所有数据点的 x 值构成的数组
    if (xDomain === undefined) xDomain = X;
    // 然后基于 xDomain 值创建一个 InternSet 对象，以便去重
    // 这样所得的 xDomain 里的元素都是唯一的，作为横坐标轴的定义域（分类的依据）
    // InternSet 对象其实是属于 JavaScript 的数据类型**集合 set** 的一种
    // 在 Set 中迭代总是按照值插入的顺序进行的，所以我们不能说这些集合是无序的（但是我们不能对元素进行重新排序，也不能直接按其编号来获取元素，但它是一个可迭代对象，有相应的其他方法来遍历其中的元素）
    // 关于 set 集合这种数据类型可以参考 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set
    // 所以每次对原数据进行重新排序后，再重新构建 InterSet 对象，其中元素/分类的顺序就会相应改变
    // 再以新构建 InterSet 对象作为横坐标的定义域，这样就可以实现各类别的重新顺序
    xDomain = new d3.InternSet(xDomain);

    // 纵坐标轴的定义域 [ymin, ymax] 其中最大值 ymax 使用方法 d3.max(Y) 从所有数据点的 y 值获取
    if (yDomain === undefined) yDomain = [0, d3.max(Y)];

    // 这里还做了一步数据清洗
    const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

    // 更新坐标轴对象（通过重新设定各坐标轴的定义域范围）
    xScale.domain(xDomain);
    yScale.domain(yDomain);

    // 创建一个过渡管理器
    // 并配置过渡时间
    const t = svg.transition().duration(duration);

    // 为矩形柱子元素重新绑定数据（索引值）
    rect = rect
      // 为了复用元素（制作连续的过渡动画），所以需要设置第二个参数（称为 key 函数）
      // key 函数会被元素和数据分别依次调用，最后返回一个字符串作为标识符
      // 分别计算出表示各元素的标识符，和表示数据的标识符，如果两者的键匹配，则它们就会配对绑定
      .data(I, function (i) {
        // key 函数
        // 如果是元素调用该函数时 this.tagName === "rect" 为 true，则返回元素原来就设定的属性 this.key 作为标识符（就是该柱子所对应的字母名称）
        // 如果是数据（索引值）调用该函数时 this.tagName === "rect" 为 false，则返回数据（索引值）在新的排序下所对应的字母的名称 X[i]
        return this.tagName === "rect" ? this.key : X[i];
      })
      // 调用 join() 方法更新页面的元素
      // 该方法最后会返回 entering 选择集和 updating 选择集合并在一起的选择集
      .join(
        // 虽然在本示例中数据并没有增删，只是位置进行了更新
        // 但是这里依然手动设置 enterinentering 选择集、exiting 选择集和 updating 选择集的处理方法
        // 可以让代码更通用
        // 处理 entering 选择集的元素
        (enter) =>
          enter
            .append("rect") // 将该选择集中的虚拟元素以 <rect> 元素的形式添加到页面上
            // 为新增的元素添加一个 key 属性，属性值采用相应的字母名称，作为元素的唯一标识符
            // 在之后的过渡动效中使用，以便程序更准确地（设置移动位置）复用这些元素
            .property("key", (i) => X[i]) // for future transitions
            // 然后调用 position() 方法设置新增的矩形柱元素的 (x, y) 坐标以及宽高
            .call(position, (i) => xScale(X[i]), yScale(0))
            // 设置一个 CSS 属性 mix-blend-mode，设置为 multiple
            // 当新增的柱子插入的到页面时，与已有的柱子之间重叠时会产生加深颜色的效果
            .style("mix-blend-mode", "multiply")
            .call((enter) => enter.append("title")), // 设置新增柱子的提示信息
        // 处理 updating 选择集的元素
        // 对于在页面上原有的且需要保留的元素先不做处理
        // 直接返回该选择集
        (update) => update,
        // 处理 exting 选择集的元素
        // 移除新数据中没有的相应柱子
        // 使用过渡管理器 t 的配置，为该过程该过程创建一个过渡
        (exit) =>
          exit
            .transition(t)
            .delay(delay) // 而且设置一个过渡延迟
            // 过渡的效果是从原来的位置向下缩小移除
            .attr("y", yScale(0)) // 过渡的最终矩形的纵坐标是在纵坐标的零点
            .attr("height", 0) // 过渡的最终矩形的高度是 0
            .remove() // 将元素移除
      );

    // 这里更新柱子（包含 updating 选择集和 entering 选择集）的提示信息
    // 其中上面在更新元素所绑定的数据时，对 entering 选择集的元素设置了 <title> 元素，所以该选择集的元素的提示信息已经是最新的了
    // 而 updating 选择集中是保留下来的元素，所以提示信息并不需要改变
    // 这一步似乎是冗余的，可以不用
    rect.select("title").text((i) => [X[i], format(Y[i])].join("\n"));

    /**
     *
     * 基于更新后的数据来调整页面的柱子
     * 以及重新绘制坐标轴
     *
     */
    // 更新矩形柱子的位置和尺寸
    // 使用过渡管理器 t 的配置，为该过程该过程创建一个过渡
    rect
      .transition(t)
      // 而且通过 delay 函数为每一个柱子设置不同的过渡延迟
      // 实现交错过渡移动的效果
      .delay(delay)
      // 调用 position() 方法更新矩形柱子的位置和尺寸
      // 传入柱子的 x 值访问函数和 y 值访问函数（采用新的坐标轴比例尺，计算出新的坐标值）
      .call(
        position,
        (i) => xScale(X[i]),
        (i) => yScale(Y[i])
      );

    // 更新横坐标轴
    // 使用过渡管理器 t 的配置，为该过程该过程创建一个过渡
    xGroup
      .transition(t)
      // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来（而且会自动删除或复用已有的坐标轴）
      .call(xAxis)
      // 而且通过 delay 函数为每一个 tick 刻度（包含刻度线和对应的刻度值）设置了不同的延迟
      // 这里假设刻度和柱子是一一对应的，这样在视觉上看起来才会像是刻度值随着柱子同步移动更新的
      .call((g) => g.selectAll(".tick").delay(delay));

    // 更新纵坐标轴
    // Transition the y-axis, then post process for grid lines etc.
    // 使用过渡管理器 t 的配置，为该过程该过程创建一个过渡
    yGroup
      .transition(t)
      // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来（而且会自动删除或复用已有的坐标轴）
      .call(yAxis)
      .selection() // 选中过渡管理器所绑定的选择集
      // 传入的参数 g 就是该选择集（该选择集就包含纵坐标轴的容器 <g> 元素）
      // 然后选中并删除坐标轴线（具有 domain 类名）
      .call((g) => g.select(".domain").remove())
      // 调整参考线
      // 因为在本示例中仅是数据的排序发生变化，而并没有增删数据，所以数据的范围并不变
      // 即纵坐标轴的定义域范围并不会改变，实际无需重绘/调整参考线
      // 但是这里添加这一段代码可以让该示例更通用
      .call((g) => {
        // 先选中所有的刻度容器（具有 tick 类名，包含刻度线和刻度值）
        // 再进行二次选择，选中其中带有 grid 的类名的元素（就是更新纵坐标轴后依然保留下来的那些参考线）
        // 关于次级选择的工作原理和结构可以参考 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
        // 在更新纵坐标轴后，如果刻度（容器）是复用原来的，那么二次选择后的选择集中就包含参考线元素；如果刻度（容器）是新增的，那么二次选择后选择集就是空的
        // 接着先为选择集绑定数据 .data([,]) 该数组只有一个元素，因为每个刻度容器里只需要绘制一条参考线。这样所有的选择集（的第一个元素）会绑定一个数据，对于选择集为空的情况，就会创建一个虚拟元素来与数据匹配，这个虚拟 DOM 就会进入 entering 选择集
        // 因为这里是为了在页面添加元素（参考线），所以绑定数据的具体值是无所谓的，在这个示例中相当于为元素绑定一个 undefined 作为数据
        // 然后调用 join(grid) 方法，只传入第一个参数，即只对 entering 选择集进行处理，即调用 grid() 函数为空的选择集添加上一个 <line> 元素（参考线）
        g.selectAll(".tick").selectAll(".grid").data([,]).join(grid);
      });
  }

  return update;
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
const margin = { top: 20, right: 20, bottom: 30, left: 20 };

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
// 数据来源网页 https://observablehq.com/@d3/bar-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/04f66f9f466d8293c798cefdd8a36021/raw/686830fb1232d7ea7ca8014b3bf959ab928e173a/alphabet.csv";

// sort methods
const sortMethods = {
  ascendByLetter: (a, b) => d3.ascending(a.letter, b.letter),
  ascendByFrequency: (a, b) => d3.ascending(a.frequency, b.frequency),
  descendByFrequency: (a, b) => d3.descending(a.frequency, b.frequency)
};

// data to vis
let data;

// the update chart function
let updateChart;

d3.csv(dataURL, d3.autoType).then((result) => {
  data = result;
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 构建散点图矩阵
  updateChart = BarChart(data, svg, {
    x: (d) => d.letter,
    y: (d) => d.frequency,
    yFormat: "%", // 纵轴的刻度值采用百分比表示
    yLabel: "↑ Frequency",
    width,
    height,
    color: "steelblue",
    duration: 750 // 过渡时间，设置较长的持续时间，以作演示
  });

  // sort by letter ascending (by default)
  updateChart(d3.sort(data, sortMethods.ascendByLetter));
});

const radioButtons = document.querySelectorAll('input[name="sort-type"]');

for (const radioBtn of radioButtons) {
  radioBtn.addEventListener("change", () => {
    if (radioBtn.checked && updateChart) {
      updateChart(d3.sort(data, sortMethods[radioBtn.value]));
    }
  });
}
