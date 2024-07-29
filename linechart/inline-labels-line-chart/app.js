// 参考自 https://observablehq.com/@d3/inline-labels/2

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
const marginTop = 30;
const marginRight = 50;
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
// 数据来源网页 https://observablehq.com/@d3/inline-labels/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/015c133b027fe8c17d0aeea9a7b36a27/raw/6cccd512a2855341e9eca6a568097b2cd48c856f/fruit.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 再使用 JS 数组原生方法 arr.flatMap(mapFunc) 对原数据集进行转换
  // 该方法先遍历数组的每一个元素（让它们分别执行 mapFunc 函数），然后再将所得的嵌套数组展平（一级）
  // 原数组 data 是一个对象数组，即每个元素都是一个对象，表示 csv 表格的一行数据
  // 这里 mapFunc 映射/转换函数是  d => data.columns.slice(1).map(fruit => ({date: d.date, fruit, value: d[fruit]}))
  // 其作用是将原数组中的每个元素「分解」为一个二元数组
  // 其中 data.columns 是 D3 在解析 csv 时为数组 data 添加的属性 columns，它也是一个数组包含了表格的列属性
  //  ⚠️ 注意只从第二个元素开始提取 data.columns.slice(1) 因为 csv 的第一列是 date 日期，而后面各列（第二列和第三列）表示不同的水果（Apple 和 Bananas），所以 data.columns.slice(1) 是一个二元数组 `["Apples", "Bananas"]`
  // 基于该二元数组（按照不同的水果类型）可以从 csv 表格的每一行数据 d 中提取出两个对象，每个对象都具有相同的属性 {date: d.date, fruit, value: d[fruit]}
  // * 属性 date 表示数据点对应的时间
  // * 属性 fruit 表示数据点对应的水果类型
  // * 属性 value 表示具体的（水果）数值
  // 最后再将所得的嵌套数组（其中包含一系列二元数组）展开，得到一个扁平化的数组
  const fruit = data.flatMap(d => data.columns.slice(1).map(fruit => ({ date: d.date, fruit, value: d[fruit] })));
  // 其作用就是将原数组中一个元素（包含的 Apples 和 Bananas）分解为两个元素（只包含 Apple 或 Bananas）

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
    // 由于数据集 fruit 中的元素是按时间顺序进行排序的
    // 所以横坐标的（时间）范围可以从数据集（数组）的第一个元素 fruit[0] 和最后一个元素 fruit[fruit.length - 1] 获取
    .domain([fruit[0].date, fruit[fruit.length - 1].date])
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（水果的销量❓），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围 [0, ymax]
    // 从数据集的每个数据点中提取出水果相关的数值，并用 d3.max() 计算出最大值
    .domain([0, d3.max(fruit, d => d.value)])
    // 设置值域范围（所映射的可视元素）
    // svg 元素的高度（减去留白区域）
    .range([height - marginBottom, marginTop]);

  // 设置颜色比例尺
  // 为不同的线段（水果类型）设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal 或 https://github.com/d3/d3-scale/tree/main#scaleOrdinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
    // 设置定义域范围
    // 各系列的名称，即各种水果的类型（会自动去除重复的值，所以只包括 Apple 和 Bananas 共 2 种）
    .domain(fruit.map(d => d.fruit))
    // 设置值域范围
    // 使用 D3 一种的内置 Color Scheme 配色方案 d3.schemeCategory10
    // 它是一个数组，包含一些预设的颜色值
    // 相关模块是 https://github.com/d3/d3-scale-chromatic/
    // 也可以参考官方文档 https://d3js.org/d3-scale-chromatic/categorical
    .range(d3.schemeCategory10);

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
  // 💡 注意以上通过方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 为每个线段创建容器 <g>
  const series = svg.append("g")
    .selectAll()
    // 绑定数据
    // 先使用 D3 的内置方法 d3.group(iterable, ...keys) 对可迭代对象的元素进行分组转换
    // 第一参数 iterable 是需要分组的可迭代对象
    // 第二个参数 ...keys 是一系列返回分组依据的函数，数据集中的每个元素都会调用该函数，入参就是当前遍历的元素 d
    // 并返回一个 InterMap 对象（映射，键名是分组依据，相应的值是在原始数组中属于该分组的元素）
    // 具体可以参考官方文档 https://d3js.org/d3-array/group#group 或 https://github.com/d3/d3-array/tree/main#group
    // 或参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#转换
    // 在这里是基于水果类型 d => d.fruit 对数据集 fruit 的元素进行分组
    // 所以返回的 InterMap 对象会具有 2 个类别，键名是 Apple 和 Bananas，它们分别绑定一个 <g> 元素
    .data(d3.group(fruit, d => d.fruit))
    .join("g"); // 将 <g> 容器添加到 <svg> 元素内

  // 绘制折线图内的线段
  // 在上述的每个线段的容器 <g> 中添加一个 <path> 作为子元素，用于绘制折线
  // 新添加的元素构成新的选择集（组）
  // 💡 由于新的选择集组，每个都只包含一个元素，所以会**继承**父元素所绑定的数据
  // 前面为每个（父元素）<g> 绑定的数据是 InterMap 对象（映射）的一个键值对
  // 而绑定数据后，会将这个键值对（隐式）转换为数组 [key, arrValue] 形式 ❓
  // 这里的 key 就是水果类型，arrValue 就是属于该水果类型的数据点
  series.append("path")
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    // 基于所绑定的数据（一个二元数组 [key, arrValue]）的第一个元素 d[0] 水果类型，再通过颜色比例尺 color(d[0]) 的映射得到对应的颜色
    .attr("stroke", d => color(d[0]))
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    // 使用方法 d3.line() 创建一个线段生成器
    // 通过 line.x() 设置横坐标读取函数，该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    // 同理，通过 line.y() 设置纵坐标读取函数
    .attr("d", d => d3.line()
      .x(d => x(d.date))
      .y(d => y(d.value))(d[1]));
  // 通过 line(d[1]) 调用线段生成器，返回的结果是字符串，作为 <path> 元素的属性 d 的值
  // 这里的 d[1] 是指所绑定的数据（一个二元数组 [key, arrValue]）的第二个元素，就是属于当前水果类型的数据点

  /**
   *
   * 为线段添加标注
   *
   */
  // 在上述的每个线段容器 <g> 中再添加一个 <g> 作为子元素，用作该线段标签的容器
  // 新添加的元素构成新的选择集（组）
  // 💡 由于新的选择集组，每个都只包含一个元素，所以会**继承**父元素所绑定的数据
  // 前面为每个（父元素）<g> 绑定的数据是 InterMap 对象（映射）的一个键值对
  // 而绑定数据后，会将这个键值对（隐式）转换为数组 [key, arrValue] 形式 ❓
  // 这里的 key 就是水果类型，arrValue 就是属于该水果类型的数据点
  series.append("g")
    // 设置文字笔画端点的样式
    .attr("stroke-linecap", "round")
    // 设置文字笔画之间连接样式（圆角让连接更加平滑）
    .attr("stroke-linejoin", "round")
    // 设置文字对齐方式（"middle" 表示居中对齐）
    .attr("text-anchor", "middle")
    // 使用 selection.selectAll() 基于原有的选择集进行「次级选择」，选择集会发生改变
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
    .selectAll()
    // 返回的选择集是由多个分组（各个 <g> 容器中）的虚拟/占位 <text> 元素构成的
    // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
    // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
    // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
    // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
    // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
    // 每一个分组都会调用该方法，并依次传入三个参数：
    // * 当前所遍历的分组的父节点所绑定的数据 datum
    // * 当前所遍历的分组的索引 index
    // * 选择集的所有父节点 parent nodes
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
    // 所以入参 d 是 InterMap 对象（映射）的一个键值对（转换为二元数组 [key, arrValue] 形式）
    // 这里的 d[1] 是指所绑定的数据（一个二元数组 [key, arrValue]）的第二个元素，就是当前水果类型的数据点
    .data(d => d[1])
    .join("text") // 将一系列 <text> 元素绘制到页面上
    .text(d => d.value) // 设置文本内容，就是对应的水果数值
    .attr("dy", "0.35em") // 设置文本在纵轴的偏移量
    // 设置 <text> 元素的定位 (x, y)
    .attr("x", d => x(d.date)) // 横坐标值
    .attr("y", d => y(d.value))  // 纵坐标值
    // 对于每个 <text> 元素执行以下函数
    // 基于它在选择集中的的索引值 i 与该选择集的所有数据集 data 的长度，判断当前所遍历的 <text> 是否为最后一个元素
    .call(text => text.filter((d, i, data) => i === data.length - 1)
      // 如果是最后一个 <text> 元素，就在其中插入 <tspan> 元素
      .append("tspan")
      // 设置字体样式为粗体
      .attr("font-weight", "bold")
      // 内容是当前 <text> 元素所绑定的数据的属性 d.fruit 即该数据点所属的水果类型
      .text(d => ` ${d.fruit}`))
    // 以上操作可以在每个线段的最后添加上对应的水果类型标记
    // 使用方法 selection.clone(deep) 克隆选择集中的元素，如果参数 deep 是 true，表示进行深度拷贝（包含子元素）
    // 这里会对前面所有 <text> 元素进行复制
    // 再通过方法 selection.lower() 采用 prepend 方式（作为父节点的第一个子元素），重新将选择集的元素插入页面
    // 即这些拷贝而生成的 <text> 元素会在（标注信息）容器中排在较前的位置，而原本的 <text> 元素会排在较后的位置
    // 根据 SVG 绘图顺序与显示层叠关系，原本的 <text> 元素会覆盖掉拷贝生成的 <text> 元素
    // 实际上拷贝生成的 <text> 元素的作用只是作为白色的描边（背景），让原本的 <text> 元素的文字内容更易阅读
    .clone(true).lower()
    // 没有填充色
    .attr("fill", "none")
    // 描边为白色
    .attr("stroke", "white")
    // 设置描边宽度
    .attr("stroke-width", 6);

});
