// 参考自 https://observablehq.com/@d3/streamgraph/2

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
const marginTop = 10;
const marginRight = 10;
const marginBottom = 20;
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
// 数据来源网页 https://observablehq.com/@d3/streamgraph/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/2f0ded2f9f5114951757eef75386e1e4/raw/dd0ac6764fc2cc2214177523b5a20c24150dd6a5/unemployment.csv";

// 从远端获取 csv 文件并进行解析
// 参考 d3-fetch 模块 https://d3js.org/d3-fetch#csv
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 对数据进行转换
   *
   */
  // 决定有哪些系列进行堆叠可视化
  // 通过堆叠生成器对数据进行转换，便于后续绘制堆叠图
  // 返回一个数组，每一个元素都是一个系列（整个面积图就是由多个系列堆叠而成的）
  // 而每一个元素（系列）也是一个数组，其中每个元素是属于该系列的一个数据点，例如在本示例中，有 122 个月份的数据，所以每个系列会有 122 个数据点
  // 具体可以参考官方文档 https://d3js.org/d3-shape/stack
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
  const series = d3.stack()
      // 设置基线函数，通过更新堆叠图的上下界的值，可以调整图形整体的定位
      // D3 提供了一系列内置的基线函数，它们的具体效果可以参考 https://d3js.org/d3-shape/stack#stack-offsets
      // 默认使用内置基线函数 d3.stackOffsetNone 以零为基线
      // 这里使用另一种内置基线函数 d3.stackOffsetWiggle 通过移动基线，以最大程度地减小各系列的「振幅」（即各系列沿着横轴上下摆动的幅度），让河流图看起来更美观、流畅、易读
      // 它一般用在河流图中，并与排序函数 d3.stackOrderInsideOut 配合使用
      // 可以阅读相关文章 https://leebyron.com/streamgraph/ 对这种算法的介绍
      .offset(d3.stackOffsetWiggle)
      // 设置排序函数，即决定堆叠图中各系列的叠放次序
      // 该函数返回的是一个数组（称为排序数组 order），里面的元素是一个表示索引的数值，依次对应于系列名称数组的元素，表示各系列的排序/叠放优先次序
      // D3 提供了一系列内置的排序函数，它们的具体效果可以参考 https://d3js.org/d3-shape/stack#stack-orders
      // 默认使用内置排序函数 d3.stackOrderNone 它不对排序/叠放次序进行改变
      // 即按照系列名称数组（通过方法 stack.keys() 所设置的）来排序
      // 这里使用了另一种内置的排序函数 d3.stackOrderInsideOut
      // 它是根据各系列的最大值进行排序，将较大的系列置于堆叠图的中间（一般用于河流图中）
      // 可以阅读相关文章 https://leebyron.com/streamgraph/ 对这种布局的介绍
      .order(d3.stackOrderInsideOut)
      // 设置系列的名称（数组）
      // 使用 d3.union() 从所有数据点的属性 industry 的值中求出并集，返回一个集合 set
      // 即数据集中包含了哪几种（名称不同的）行业
      // 该方法来自 d3-array 模块，具体可以参考官方文档 https://d3js.org/d3-array/sets#union
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#集合
      // D3 为每一个系列都设置了一个属性 key，其值是系列名称（生成面积图时，系列堆叠的顺序就按照系列名称的排序）
      .keys(d3.union(data.map(d => d.industry)))
      // 设置各系列的数据读取函数
      // 在调用堆叠生成器对原始数据进行转换过程中，每一个原始数据 d 和系列名称 key（就是通过方法 stack.keys() 所设置的数组中的元素）会作为入参，分别调用该函数，以从原始数据中获取相应系列的数据
      // 数据读取函数的逻辑要如何写，和后面 👇👇 调用堆叠生成器时，所传入的数据格式紧密相关
      // 因为传入的数据 d3.index(data, d => d.date, d => d.industry) 是一个嵌套映射
      // 在遍历数据点时（映射会变成一个二元数组 [键名，值] 的形式），要从中获取相应系列的数据
      // 首先要对当前所遍历的数据点进行解构 [key, value] 第二个元素就是映射（第一层）的值，它也是一个映射
      // 然后再通过 D.get(key) 获取相应系列（行业）的数据（一个对象）
      // 堆叠的数据是失业人数，所以最后返回的是该系列数据（对象）的 unemployed 属性
      .value(([, D], key) => D.get(key).unemployed)
    // 调用堆叠生成器，传入数据
    // 传入的数据并不是 data 而是经过 d3.index() 进行分组归类转换的
    (d3.index(data, d => d.date, d => d.industry));
  // 💡 虽然所绘制的河流图中，所对应的纵坐标值都是正数，这是由于坐标轴的刻度值是经过处理的，实际上在零点下方的刻度值是负数
  // 相应地经过以上堆叠器转换所得的（表示上下界）数据中是有正负值，在纵坐标轴的零点之上的堆叠面积所对应的数据为正，在零点之下堆叠的面积所对应的数据为负

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，即处于不同时区的用户查看图表时也会显示同样的时间
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
  // 纵坐标轴的数据是连续型的数值（与失业人数相关），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
      // 设置定义域范围 [ymin, ymax]
      // 定义域的范围就是 series 的范围
      // 由于 series 是嵌套数组，所以先使用 JS 数组的原生方法 Array.flat() 展平数组
      // 再使用 d3.extent(arr) 计算出它的范围
      .domain(d3.extent(series.flat(2)))
      // 设置值域范围（所映射的可视元素）
      // 使用 scale.rangeRound() 方法，可以进行修约，以便实现整数映射到整数（像素）
      // svg 元素的宽度（减去留白区域）
      .rangeRound([height - marginBottom, marginTop]);

  // 设置颜色比例尺
  // 为不同系列设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
      // 设置定义域范围
      // 各系列的名称，即 14 种行业
      .domain(series.map(d => d.key))
      // 设置值域范围
      // 使用 D3 内置的一种配色方案 d3.schemeTableau10
      // 它是一个数组，包含一些预设的颜色（共 10 种）
      // 具体可以参考官方文档 https://d3js.org/d3-scale-chromatic/categorical#schemeTableau10
      // 这里的系列数量是 14 种，而 d3.schemeTableau10 配色方案种只有 10 种颜色
      // 💡 排序比例尺会将定义域数组的第一个元素映射到值域的第一个元素，依此类推。如果值域的数组长度小于定义域的数组长度，则值域的元素会被从头重复使用进行映射，即进行「循环」映射
      // 所以仔细查看会发现有些系列所对应的颜色有重复
      // 但是在堆叠图中只要相邻的系列不采用相同的颜色，即可达到区分的作用，所以系列数量和颜色数量不相等也不影响实际效果
      // 也可以查看官方文档 https://d3js.org/d3-scale-chromatic/categorical 采用其他（提供更多颜色的）配色方案，让各种系列都有唯一的颜色进行标识
      .range(d3.schemeTableau10);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制纵坐标轴
  // 它和一般图表的坐标轴不一样，因为河流图的基线位于 svg 的中间（不一定是零点）
  // 💡 所以纵坐标轴的零点不一定在 x 轴的位置
  svg.append("g")
      // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
      .attr("transform", `translate(${marginLeft},0)`)
      // 纵轴是一个刻度值朝左的坐标轴
      // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
      // 然后使用方法 axis.tickFormat() 设置刻度值的格式
      // 💡 数据集 series 是对原始数据处理后所得的，为了方便实现河流图的布局，它是含有正负值
      // 然后采用比例尺 y 将 series 数据映射为河流图，则基于比例尺 y 所生成的纵坐标轴的刻度值也有正负值（与 series 数据相对应），但是实际上失业人数并不存在负数
      // 所以这里需要对刻度值进行处理，使用 Math.abs() 取绝对值，将负值变成正值，所以最终纵坐标轴的刻度值在零点上下都是正值
      // 并且使用 number.toLocaleString("en-US") 格式化数字（转换为字符串，以符合特定的语言环境的表达方式）
      .call(d3.axisLeft(y).ticks(height / 80).tickFormat((d) => Math.abs(d).toLocaleString("en-US")))
      // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
      .call(g => g.select(".domain").remove())
      // 复制了一份刻度线，用以绘制图中横向的网格参考线
      .call(g => g.selectAll(".tick line").clone()
          // 调整复制后的刻度线的终点位置（往右移动）
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1))
      // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
      .call(g => g.append("text")
          // 将该文本移动到坐标轴的顶部（即容器的左上角）
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor") // 设置文本的颜色
          .attr("text-anchor", "start") // 设置文本的对齐方式
          .text("↑ Unemployed persons")); // 设置文本内容

  // 绘制横坐标轴
  svg.append("g")
      // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
      .attr("transform", `translate(0,${height - marginBottom})`)
      // 横轴是一个刻度值朝下的坐标轴
      // 将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .call(d3.axisBottom(x).tickSizeOuter(0))
      // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
      .call(g => g.select(".domain").remove());

  /**
   *
   * 绘制面积图内的面积形状
   *
   */
  // 使用 d3.area() 创建一个面积生成器
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = d3.area()
      // 设置下边界线横坐标读取函数
      // 💡 不需要再设置上边界线横坐标读取函数，因为默认会复用相应的下边界线横坐标值，这符合横向延伸的面积图
      // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
      // 这里基于每个数据点的日期（时间）d.data[0]（这里的 d.data 是该数据点 d 转换前/原始的数据结构，它的第一个元素就是该数据点对应的日期）并采用比例尺 x 进行映射，计算出相应的横坐标
      .x(d => x(d.data[0]))
      // 设置下边界线的纵坐标的读取函数
      // 这里基于每个数据点（二元数组）的第一个元素 d[0] 并采用比例尺 y 进行映射，计算出相应的纵坐标
      .y0(d => y(d[0]))
      // 设置上边界线的纵坐标的读取函数
      // 这里基于每个数据点（二元数组）的第二个元素 d[1] 并采用比例尺 y 进行映射，计算出相应的纵坐标
      .y1(d => y(d[1]));

  // 将每个系列的面积形状绘制到页面上
  // 创建一个元素 <g> 作为容器
  svg.append("g")
    .selectAll() // 返回一个选择集，其中虚拟/占位元素是一系列的 <path> 路径元素，用于绘制各系列的形状
    .data(series) // 绑定数据，每个路径元素 <path> 对应一个系列数据
    .join("path") // 将元素绘制到页面上
      .attr("fill", d => color(d.key)) // 设置颜色，不同系列/堆叠层对应不同的颜色
      // 由于面积生成器并没有调用方法 area.context(parentDOM) 设置画布上下文
      // 所以调用面积生成器 area 返回的结果是字符串
      // 该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", area)
    // 最后在每个路径元素 <path> 里添加一个 <title> 元素
    // 以便鼠标 hover 在相应的各系列的面积之上时，可以显示 tooltip 提示信息
    .append("title")
      // 设置 tooltip 的文本内容 d.key 表示当前所遍历的系列名称
      .text(d => d.key);
});
