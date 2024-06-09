// 参考自 https://observablehq.com/@d3/difference-chart/2

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
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 30;

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
// 数据来源网页 https://observablehq.com/@d3/difference-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/27987ac1b8b7908db995750942b9fa55/raw/00b41720691a65e28be1d4cb7689e514f114fe45/weather.tsv";

// 创建一个时间解释器 parser，可以将特定格式的字符串解析为时间对象 Date
// 具体参考 d3-time-format 模块的官方文档 https://d3js.org/d3-time-format
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间格式器
// 参数 `%Y%m%d` 称为 specifier 时间格式说明符，这里用于匹配的字符串格式是「年月日」
// %Y 表示年份（用四个数字表示）
// %m 表示月份（用两个数字表示，不足双位数的月份在前面添加 0 来补足）
// %d 表示日期（用两个数字表示，不足的双位数的日期在前面添加 0 来补足）
const parseDate = d3.timeParse("%Y%m%d");

// 从远端获取 tsv 文件并进行解析
// 参考 d3-fetch 模块 https://d3js.org/d3-fetch#tsv
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
// 使用方法 d3.tsv(input, init, row) 解析分隔符为 \t 的 DSV 数据（具有表头信息），返回一个可迭代对象（对象数组）
// 第一个参数 input 是需要解析的数据的源地址 URL。该表格具有表头，即表格的第一行是各列的名称（而不是具体的数据项）
// 第二个参数 init 是一个对象，用于配置 fetch 相关参数，其字段需要符合 RequestInit https://fetch.spec.whatwg.org/#requestinit
// 第三个参数 row 是一个函数，用于对行数据进行转换或筛选，从第二行开始的数据项均会调用该函数，并依次传入 2 个参数：
// * d 是当前所遍历的数据项（当前的行数据）
// * i 是当前所遍历的数据项的索引，从 0 开始计算
// 这里经过转换最后得到一个对象数组，即数组的每个元素都是一个对象（表示原始表格中的一行，数据项），每个对象都具有三个属性 date 表示日期，value0 表示三藩市当天的温度，value1 表示纽约当天的温度
d3.tsv(dataURL, d => ({
  date: parseDate(d.date), // 将原始的表示日期的字符串转换为 Date 对象
  value0: +d["San Francisco"], // 三藩市的当天的温度（通过 + 将字符串转换为数值）
  value1: +d["New York"] // 纽约的当天温度
})).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 为 svg 绑定数据
  // 这里采用 selection.datum(value) 为选择集中的每个元素上绑定的数据（该选择集里只有一个 <svg> 元素）
  // ⚠️ 它与 selection.data(value) 不同，该方法不会将数组进行「拆解」
  // 即这个方法不会进行数据与元素的一一链接计算，并且不影响索引，不影响（不产生）enter 和 exit 选择集
  // 而是将数据 value 作为一个整体绑定到选择的各个元素上，因此使用该方法选择集的所有 DOM 元素绑定的数据都一样
  // 具体参考官方文档 https://d3js.org/d3-selection/joining#selection_datum
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#绑定数据
  svg.datum(data);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleTime 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用地方时，处于不同时区的用户也会显示不同的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleTime()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
    .domain(d3.extent(data, d => d.date))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（温度），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围 [ymin, ymax]
    // 其中 ymin 是最低温度，先通过 Math.min(d.value0, d.value1) 对每个数据点进行处理，提取出当天两个城市中较低的值
    // 然后通过 d3.min() 从数据集中获取温度的最低值
    // 相应地 ymax 就是最高温度
    .domain([
      d3.min(data, d => Math.min(d.value0, d.value1)),
      d3.max(data, d => Math.max(d.value0, d.value1))
    ])
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([height - marginBottom, marginTop]);

  // 设置颜色比例尺
  // 为不同的面积区域设置不同的颜色，以对应数据的不同（差异）关系
  // 只有两种情况：其中一种情况是当天温度纽约高于三藩市；另一种情况是当前温度三藩市高于纽约
  // 所以只需要提供两种颜色进行映射对照
  // 这里使用 D3 内置的一种配色方案 d3.schemeRdYlBu（它属于 Diverging schemes 离散型的配色方案，用于明显地区分不同的类型）
  // 它是一个嵌套数组，包含一些预设的配色方案（共 9 种对色谱采样的方式）
  // 具体可以参考官方文档 https://d3js.org/d3-scale-chromatic/diverging#schemeRdYlBu
  // 这里采用第三个配色方案 d3.schemeRdYlBu[3] 它也是一个数组，包含 3 个元素，每个元素都是一个表示颜色的字符串
  // d3.schemeRdYlBu[3][2] 获取一种颜色（#91bfdb 浅蓝色），d3.schemeRdYlBu[3][0] 获取另一种颜色（#fc8d59 橙色），它们分别用于映射对照不同的数据（差异）关系
  const colors = [d3.schemeRdYlBu[3][2], d3.schemeRdYlBu[3][0]];

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
    .call(d3.axisBottom(x)
        // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
       .ticks(width / 80)
        // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
       .tickSizeOuter(0))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove());
  // 💡 注意以上使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    .call(d3.axisLeft(y))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中横向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
        // 调整复制后的刻度线的终点位置（往右移动）
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1)) // 调小参考线的透明度
    // 为纵坐标轴添加标注信息
    // 并选中最后一个刻度值，即 <text> 元素，进行复制
    .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", -marginLeft) // 设置元素的偏移量
        .attr("y", -30)
        .attr("fill", "currentColor") // 设置文字的颜色
        .attr("text-anchor", "start") // 设置文字的对齐方式
        .text("↑ Temperature (°F)")); // 设置文本内容

  /**
   *
   * 绘制面积图内的面积形状
   *
   */
  // 创建一个 <clipPath> 元素（一般具有属性 id 以便被其他元素引用），其作用充当一层剪贴蒙版，具体形状由其包含的元素决定
  // 它一般与其他元素一起使用（通过属性 clip-path 来指定），为其他元素自定义了视口
  // 即在 <clipPath> 所规定的区域以外的部分都会被裁剪掉
  // 具体介绍可以参考 https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath
  svg.append("clipPath")
    // 为 <clipPath> 设置属性 id
    .attr("id", "above")
    // 在其中添加 <path> 子元素，以设置剪切路径的形状
    .append("path")
      // 使用方法 d3.area() 创建一个面积生成器，它会根据给定的数据（svg 所绑定的数据）设置 <path> 路径形状
      // 💡 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
      // 具体可以参考官方文档 https://d3js.org/d3-shape/area
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
      .attr("d", d3.area()
          // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveStep
          // 该插值效果是在两个数据点之间，生成阶梯形状的线段（作为面积图的边界）
          // 具体效果参考 https://d3js.org/d3-shape/curve#curveStep
          .curve(d3.curveStep)
          // 设置下边界线横坐标读取函数
          // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
          // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
          .x(d => x(d.date))
          // 设置下边界线的纵坐标的读取函数，它始终是 0（即位于 svg 的顶部位置）
          .y0(0)
          // 设置上边界线的纵坐标的读取函数，基于 d.value1 纽约的温度，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
          .y1(d => y(d.value1)));
  // 正如该剪贴路径的 id 名称一样，该剪贴蒙版的显示区域/视口范围位于 svg 的上半部分，即从 svg 的顶部，直到橙色面积的下边缘
  // 通过该剪切路径的约束，可以呈现由两地之间较低的日间温度所构成的的折线

  // 创建一个 <clipPath> 元素
  svg.append("clipPath")
    // 为 <clipPath> 设置属性 id
    .attr("id","below")
    // 在其中添加 <path> 子元素，以设置剪切路径的形状
    .append("path")
      // 使用方法 d3.area() 创建一个面积生成器，它会根据给定的数据（svg 所绑定的数据）设置 <path> 路径形状
      .attr("d", d3.area()
          // 设置两点之间的曲线插值器
          .curve(d3.curveStep)
          // 设置下边界线横坐标读取函数
          .x(d => x(d.date))
          // 设置下边界线的纵坐标的读取函数，它始终是 height（即位于 svg 的底部位置，即横坐标轴）
          .y0(height)
          // 设置上边界线的纵坐标的读取函数，基于 d.value1 纽约的温度，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
          .y1(d => y(d.value1)));
  // 正如该剪贴路径的 id 名称一样，该剪贴蒙版的显示区域/视口范围位于 svg 的下部分，即从 svg 的底部，直到蓝色面积的下边缘
  // 通过该剪切路径的约束，可以呈现由两地之间较高的日间温度所构成的的折线

  // 💡 通过以上两个 <clipPath> 对面积图的共同约束，就可以裁剪出所需的差异图

  // 绘制表示三藩市温度的面积图，并通过 <clipPath> 进行裁剪
  svg.append("path") // 使用路径 <path> 元素绘制面积形状
      // 设置属于 clip-path 以采用前面预设的 <clipPath id="above"> 对图形进行裁剪/约束
      .attr("clip-path", "url(#above)")
      .attr("fill", colors[1]) // 设置填充颜色为橙色
      // 使用方法 d3.area() 创建一个面积生成器，它会根据给定的数据（svg 所绑定的数据）设置 <path> 路径形状
      .attr("d", d3.area()
          // 设置两点之间的曲线插值器
          .curve(d3.curveStep)
          // 设置下边界线横坐标读取函数
          .x(d => x(d.date))
          // 设置下边界线的纵坐标的读取函数，它始终是 height（即位于 svg 的底部位置，即横坐标轴）
          .y0(height)
          // 设置上边界线的纵坐标的读取函数，基于 d.value0 三藩市的温度，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
          .y1(d => y(d.value0)));
    // 💡 通过 <clipPath id="above"> 对面积图的裁剪，只显示三藩市温度面积图的部分，即橙色的部分，由于这部分的区域（所对应的时间里）纽约的温度更低

  // 绘制表示纽约温度的面积图，并通过 <clipPath> 进行裁剪
  svg.append("path") // 使用路径 <path> 元素绘制面积形状
      // 设置属于 clip-path 以采用前面预设的 <clipPath id="below"> 对图形进行裁剪/约束
      .attr("clip-path", "url(#below)")
      .attr("fill", colors[0]) // 设置填充颜色为浅蓝色
      // 使用方法 d3.area() 创建一个面积生成器，它会根据给定的数据（svg 所绑定的数据）设置 <path> 路径形状
      .attr("d", d3.area()
          // 设置两点之间的曲线插值器
          .curve(d3.curveStep)
          // 设置下边界线横坐标读取函数
          .x(d => x(d.date))
          // ⚠️ 设置下边界线的纵坐标的读取函数，它始终是 0（即位于 svg 的顶部位置）
          // ⚠️ 和普通的面积图有所不同，可以理解为真正表示纽约温度的面积图是透明的，而（这里绘制的）与它互补的部分则填充为浅蓝色
          // ⚠️ 结合 <clipPath> 的裁剪，剩余的部分就是三藩市温度比纽约高的日子
          .y0(0)
          // 设置上边界线的纵坐标的读取函数，基于 d.value0 三藩市的温度，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
          .y1(d => y(d.value0)));

  // 绘制一条黑色的线，表示三藩市的温度随时间的变化
  svg.append("path") // 使用路径 <path> 元素绘制折线
    .attr("fill", "none") // 由于折线不需要填充颜色，所以属性 fill 设置为 none
    .attr("stroke", "black") // 设置折线的描边颜色为黑色
    .attr("stroke-width", 1.5) // 设置描边的宽度
    .attr("stroke-linejoin", "round") //
    .attr("stroke-linecap", "round") // 设置折线之间的连接样式（圆角让连接更加平滑）
    // 使用方法 d3.line() 创建一个线段生成器，线段生成器会基于给定的数据（svg 所绑定的数据）生成线段（或曲线）
    // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
    // 具体可以参考官方文档 https://d3js.org/d3-shape/line 或 https://github.com/d3/d3-shape/tree/main#lines
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
    .attr("d", d3.line()
        // 设置两点之间的曲线插值器
        .curve(d3.curveStep)
        // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次横坐标读取函数和纵坐标读取函数，以返回该数据所对应的横纵坐标值
        // 设置横坐标读取函数
        // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
        .x(d => x(d.date))
        // 设置纵坐标读取函数
        // 这里基于每个数据点的三藩市的温度 d.value0 并采用比例尺 y 进行映射，计算出相应的纵坐标
        .y(d => y(d.value0)));

  // 绘制一条绿色的线，表示纽约的温度随时间的变化
  // svg.append("path")
  //   .attr("fill", "none")
  //   .attr("stroke", "green")
  //   .attr("stroke-width", 1.5)
  //   .attr("stroke-linejoin", "round")
  //   .attr("stroke-linecap", "round")
  //   .attr("d", d3.line()
  //       .curve(d3.curveStep)
  //       .x(d => x(d.date))
  //       .y(d => y(d.value1)));
});
